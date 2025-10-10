import { Firehose } from '@aikyo/firehose'
import { QueryResultSchema } from '@aikyo/server'
import { z } from 'zod'

async function createFirehose(port: number, fromName: string) {
  const firehose = new Firehose(port)
  await firehose.start()

  firehose.setReceiveHandler(async (rawData) => {
    console.log(rawData)
    const RequestSchema = z.union([
      z.object({
        content: z.string(),
        type: z.enum(['chat']),
      }),
      QueryResultSchema,
    ])

    const parsed = RequestSchema.safeParse(rawData)
    if (!parsed.success) {
      throw new Error('スキーマが不正です。')
    }

    if ('content' in parsed.data) {
      return {
        topic: 'messages',
        body: {
          jsonrpc: '2.0',
          method: 'message.send',
          params: {
            id: crypto.randomUUID(),
            from: 'user_maril',
            to: [fromName],
            message: parsed.data.content,
          },
        },
      }
    } else {
      return { topic: 'queries', body: parsed.data }
    }
  })

  await firehose.subscribe('queries', (data) => {
    console.log(data)
    if (
      'params' in data &&
      data.params.type === 'speak' &&
      data.params.from === fromName &&
      data.params.body &&
      data.params.body.message
    ) {
      const emotion = data.params.body ? data.params.body.emotion : 'neutral'

      const transformed = {
        id: data.id,
        text: data.params.body.message,
        role: 'assistant',
        emotion,
        type: 'message',
      }

      firehose.broadcastToClients(transformed)
    }
  })

  await firehose.subscribe('messages', (data) => {
    console.log(data)
  })

  await firehose.subscribe('states', (data) => {
    console.log(data)
  })

  await firehose.subscribe('actions', (data) => {
    console.log(data)
  })

  return firehose
}

async function main() {
  await Promise.all([
    createFirehose(8000, 'companion_kyoko'),
    createFirehose(8001, 'companion_aya'),
    createFirehose(8002, 'companion_natsumi'),
  ])
}
main().catch(console.error)
