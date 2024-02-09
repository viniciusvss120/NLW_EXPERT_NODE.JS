import { FastifyInstance } from "fastify";
import {z} from "zod";
import { voting } from "../../utils/voting-pub-sub";

export async function pollResults(app: FastifyInstance) {
  app.get('/polls/:pollid/results', {websocket: true}, (connection, request) => {
    // Increver apenas nas msg publicadas no canal com o ID da enquete( `pollId`)
    const getPollParams = z.object({
      pollId: z.string().uuid()
    })

    const { pollId } = getPollParams.parse(request.params)

    voting.subscribe(pollId, (message) => {
      connection.socket.send(JSON.stringify(message))
    })

  })
}