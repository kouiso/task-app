import { defineConfig } from 'orval';

export default defineConfig({
  backend: {
    input: {
      target: 'http://localhost:3002/swagger-json', // URLを直接指定
    },
    output: {
      target: './src/lib/orval/orval.ts',
      clean: true,
      client: 'react-query',
      prettier: true,
      override: {
        mutator: {
          path: './src/lib/axios/index.ts',
          name: 'orvalAxiosInstance',
        },
        query: {
          useQuery: true,
          useSuspenseQuery: true,
          version: 5,
        },
      },
    },
  },
});
