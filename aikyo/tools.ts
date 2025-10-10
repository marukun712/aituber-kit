import type { Query } from '@aikyo/server'
import { createCompanionAction } from '@aikyo/utils'
import { z } from 'zod'

export const speakTool = createCompanionAction({
  id: 'speak',
  description: '発言する。',
  inputSchema: z.object({
    message: z.string(),
    to: z
      .array(
        z.string().refine((val) => val.startsWith('companion_'), {
          message: "String must start with 'companion_'",
        })
      )
      .describe(
        'このメッセージの宛先。必ずcompanion_から始まるコンパニオンidを指定してください。特定のコンパニオンに個人的に話しかけたいとき以外は、必ず、会話に参加したことのある他のコンパニオンのidを含むようにしてください。'
      ),
    emotion: z.enum(['happy', 'sad', 'angry', 'neutral']),
  }),
  topic: 'messages',
  publish: async ({ input, id, sendQuery }) => {
    const queryId = crypto.randomUUID()
    const query: Query = {
      jsonrpc: '2.0',
      id: queryId,
      method: 'query.send',
      params: {
        from: id,
        type: 'speak',
        body: { message: input.message, emotion: input.emotion },
      },
    }
    const res = await sendQuery(query, 100000)
    console.log(res)
    return {
      jsonrpc: '2.0',
      method: 'message.send',
      params: {
        id: crypto.randomUUID(),
        from: id,
        to: input.to,
        message: input.message,
        metadata: { emotion: input.emotion },
      },
    }
  },
})
