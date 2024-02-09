import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import {z} from 'zod'
export async function createPoll(app: FastifyInstance) {
  app.post('/polls', async (request, reply) => {
    const createPollBody = z.object({
      title: z.string(),
      options: z.array(z.string())
    })
    const {title, options} = createPollBody.parse(request.body)
  
    //No código a baixo estamos criando a enquete por completo, com o titulo e as opções,
    // como a tabela poll se relaciona com a tabela pollOptions, ja incluimos a  criação das opções
    // junto com a criação do titulo, pois, se por acaso acontecer um erro na criação da enquete,
    // a aplicação não deixa criar a enquete por partes.
    const poll = await prisma.poll.create({
      data: {
        title,
        option: {
          createMany:{
            data: options.map(option => {
              return { title: option}
            })
          }
        }
      }
    })

    // await prisma.pollOption.createMany({
    //   data: options.map(option => {
    //     return { title: option, pollId: poll.id}
    //   })
    // })
  
    return reply.status(201).send(poll)
  })
}