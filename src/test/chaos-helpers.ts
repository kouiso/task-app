export type RetryableMutation<T> = () => Promise<T>;

export type MutationRetryOptions = {
  retries: number;
  onFailure?: (error: unknown, attempt: number) => void;
};

export async function runMutationWithRetry<T>(
  mutation: RetryableMutation<T>,
  options: MutationRetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.retries + 1; attempt += 1) {
    try {
      return await mutation();
    } catch (error) {
      lastError = error;
      options.onFailure?.(error, attempt);
      if (attempt > options.retries) {
        throw error;
      }
    }
  }

  throw lastError;
}

export function createFlakyNetworkMutation<T>(failuresBeforeSuccess: number, result: T) {
  let attempts = 0;

  return {
    get attempts() {
      return attempts;
    },
    async mutate() {
      attempts += 1;
      if (attempts <= failuresBeforeSuccess) {
        throw new TypeError('Failed to fetch');
      }
      return result;
    },
  };
}
