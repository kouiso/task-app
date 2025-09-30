import { Message } from '@/types/chat'

export async function sendMessage(
  provider: string,
  messages: Message[],
  settings?: any
): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        messages,
        settings,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send message')
    }

    const data = await response.json()
    return data.content
  } catch (error) {
    console.error(`Error sending message to ${provider}:`, error)
    throw error
  }
}

export async function sendMessageToAll(
  providers: string[],
  messages: Message[],
  settings?: any
): Promise<Record<string, string | Error>> {
  const promises = providers.map(async (provider) => {
    try {
      const content = await sendMessage(provider, messages, settings)
      return { provider, content }
    } catch (error) {
      return { provider, error }
    }
  })

  const results = await Promise.all(promises)
  
  return results.reduce((acc, result) => {
    if ('error' in result) {
      acc[result.provider] = result.error as Error
    } else {
      acc[result.provider] = result.content
    }
    return acc
  }, {} as Record<string, string | Error>)
}