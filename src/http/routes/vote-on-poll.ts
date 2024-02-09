import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'
import { redis } from '../../lib/redis'
import { voting } from '../../utils/voting-pub-sub'

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionid: z.string().uuid()
    })

    const voteOnPollParams = z.object({
      pollId: z.string().uuid()
    })

    const { pollId } = voteOnPollParams.parse(request.params)
    const { pollOptionid } = voteOnPollBody.parse(request.body)

    let { sessionId } = request.cookies

    if(sessionId) {
      const userPreviosVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId
          }
        }
      })
      if(userPreviosVoteOnPoll && userPreviosVoteOnPoll.pollOptionid != pollOptionid) {
        // Apagar o voto anterior e criar um novo
        await prisma.vote.delete({
          where: {
            id: userPreviosVoteOnPoll.id
          }
        })
       const votes = await redis.zincrby(pollId, -1, userPreviosVoteOnPoll.pollOptionid)

        voting.publish(pollId, {
          pollOptionid: userPreviosVoteOnPoll.pollOptionid,
          votes: Number(votes)
        })
  
      } else if(userPreviosVoteOnPoll) {
        return reply.status(400).send({message: 'Você já votou nessa enquete!'})

      }
    }

    if (!sessionId) {

      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, //30 dias,
        signed: true,
        httpOnly: true
      })
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionid
      }
    })
    
    const votes = await redis.zincrby(pollId, 1, pollOptionid)

    voting.publish(pollId, {
      pollOptionid,
      votes: Number(votes)
    })

    return reply.status(201).send()
  })
}