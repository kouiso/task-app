import type { AspidaClient, BasicHeaders } from 'aspida';
import { dataToURLString } from 'aspida';
import type { Methods as Methods_ilumaa } from './address';
import type { Methods as Methods_kbfm0q } from './address/_id@string';
import type { Methods as Methods_zau27a } from './debug/check-request';
import type { Methods as Methods_xr1p1q } from './debug/test';
import type { Methods as Methods_19e4j4j } from './debug/test-auth';
import type { Methods as Methods_qleyz3 } from './payment/check';
import type { Methods as Methods_1xhk1zz } from './payment/create-payment-intent';
import type { Methods as Methods_1pyjv5a } from './payment/webhook';
import type { Methods as Methods_3lerdo } from './web-comic/_seriesHashedId@string';
import type { Methods as Methods_1mcnf0h } from './web-comic/list';
import type { Methods as Methods_y2vsrs } from './zipcode';

const api = <T>({ baseURL, fetch }: AspidaClient<T>) => {
  const prefix = (baseURL === undefined ? '' : baseURL).replace(/\/$/, '');
  const PATH0 = '/address';
  const PATH1 = '/debug/check-request';
  const PATH2 = '/debug/test';
  const PATH3 = '/debug/test-auth';
  const PATH4 = '/payment/check';
  const PATH5 = '/payment/create-payment-intent';
  const PATH6 = '/payment/webhook';
  const PATH7 = '/web-comic';
  const PATH8 = '/web-comic/list';
  const PATH9 = '/zipcode';
  const GET = 'GET';
  const POST = 'POST';
  const DELETE = 'DELETE';
  const PATCH = 'PATCH';

  return {
    address: {
      _id: (val1: string) => {
        const prefix1 = `${PATH0}/${val1}`;

        return {
          get: (option?: { config?: T | undefined } | undefined) =>
            fetch<Methods_kbfm0q['get']['resBody'], BasicHeaders, Methods_kbfm0q['get']['status']>(
              prefix,
              prefix1,
              GET,
              option,
            ).json(),
          $get: (option?: { config?: T | undefined } | undefined) =>
            fetch<Methods_kbfm0q['get']['resBody'], BasicHeaders, Methods_kbfm0q['get']['status']>(
              prefix,
              prefix1,
              GET,
              option,
            )
              .json()
              .then((r) => r.body),
          patch: (option: { body: Methods_kbfm0q['patch']['reqBody']; config?: T | undefined }) =>
            fetch<void, BasicHeaders, Methods_kbfm0q['patch']['status']>(prefix, prefix1, PATCH, option).send(),
          $patch: (option: { body: Methods_kbfm0q['patch']['reqBody']; config?: T | undefined }) =>
            fetch<void, BasicHeaders, Methods_kbfm0q['patch']['status']>(prefix, prefix1, PATCH, option)
              .send()
              .then((r) => r.body),
          $path: () => `${prefix}${prefix1}`,
        };
      },
      post: (option: { body: Methods_ilumaa['post']['reqBody']; config?: T | undefined }) =>
        fetch<void, BasicHeaders, Methods_ilumaa['post']['status']>(prefix, PATH0, POST, option).send(),
      $post: (option: { body: Methods_ilumaa['post']['reqBody']; config?: T | undefined }) =>
        fetch<void, BasicHeaders, Methods_ilumaa['post']['status']>(prefix, PATH0, POST, option)
          .send()
          .then((r) => r.body),
      get: (option: { query: Methods_ilumaa['get']['query']; config?: T | undefined }) =>
        fetch<Methods_ilumaa['get']['resBody'], BasicHeaders, Methods_ilumaa['get']['status']>(
          prefix,
          PATH0,
          GET,
          option,
        ).json(),
      $get: (option: { query: Methods_ilumaa['get']['query']; config?: T | undefined }) =>
        fetch<Methods_ilumaa['get']['resBody'], BasicHeaders, Methods_ilumaa['get']['status']>(
          prefix,
          PATH0,
          GET,
          option,
        )
          .json()
          .then((r) => r.body),
      delete: (option?: { config?: T | undefined } | undefined) =>
        fetch<void, BasicHeaders, Methods_ilumaa['delete']['status']>(prefix, PATH0, DELETE, option).send(),
      $delete: (option?: { config?: T | undefined } | undefined) =>
        fetch<void, BasicHeaders, Methods_ilumaa['delete']['status']>(prefix, PATH0, DELETE, option)
          .send()
          .then((r) => r.body),
      $path: (option?: { method?: 'get' | undefined; query: Methods_ilumaa['get']['query'] } | undefined) =>
        `${prefix}${PATH0}${option && option.query ? `?${dataToURLString(option.query)}` : ''}`,
    },
    debug: {
      check_request: {
        /**
         * テスト(リクエスト内容確認用)
         */
        get: (option?: { config?: T | undefined } | undefined) =>
          fetch<void, BasicHeaders, Methods_zau27a['get']['status']>(prefix, PATH1, GET, option).send(),
        /**
         * テスト(リクエスト内容確認用)
         */
        $get: (option?: { config?: T | undefined } | undefined) =>
          fetch<void, BasicHeaders, Methods_zau27a['get']['status']>(prefix, PATH1, GET, option)
            .send()
            .then((r) => r.body),
        $path: () => `${prefix}${PATH1}`,
      },
      test: {
        /**
         * テスト(何もしないエンドポイント)
         */
        get: (option?: { config?: T | undefined } | undefined) =>
          fetch<void, BasicHeaders, Methods_xr1p1q['get']['status']>(prefix, PATH2, GET, option).send(),
        /**
         * テスト(何もしないエンドポイント)
         */
        $get: (option?: { config?: T | undefined } | undefined) =>
          fetch<void, BasicHeaders, Methods_xr1p1q['get']['status']>(prefix, PATH2, GET, option)
            .send()
            .then((r) => r.body),
        $path: () => `${prefix}${PATH2}`,
      },
      test_auth: {
        /**
         * テスト(何もしないエンドポイント)
         */
        get: (option?: { config?: T | undefined } | undefined) =>
          fetch<void, BasicHeaders, Methods_19e4j4j['get']['status']>(prefix, PATH3, GET, option).send(),
        /**
         * テスト(何もしないエンドポイント)
         */
        $get: (option?: { config?: T | undefined } | undefined) =>
          fetch<void, BasicHeaders, Methods_19e4j4j['get']['status']>(prefix, PATH3, GET, option)
            .send()
            .then((r) => r.body),
        $path: () => `${prefix}${PATH3}`,
      },
    },
    payment: {
      check: {
        post: (option: { body: Methods_qleyz3['post']['reqBody']; config?: T | undefined }) =>
          fetch<Methods_qleyz3['post']['resBody'], BasicHeaders, Methods_qleyz3['post']['status']>(
            prefix,
            PATH4,
            POST,
            option,
          ).json(),
        $post: (option: { body: Methods_qleyz3['post']['reqBody']; config?: T | undefined }) =>
          fetch<Methods_qleyz3['post']['resBody'], BasicHeaders, Methods_qleyz3['post']['status']>(
            prefix,
            PATH4,
            POST,
            option,
          )
            .json()
            .then((r) => r.body),
        $path: () => `${prefix}${PATH4}`,
      },
      create_payment_intent: {
        post: (option: { body: Methods_1xhk1zz['post']['reqBody']; config?: T | undefined }) =>
          fetch<Methods_1xhk1zz['post']['resBody'], BasicHeaders, Methods_1xhk1zz['post']['status']>(
            prefix,
            PATH5,
            POST,
            option,
          ).json(),
        $post: (option: { body: Methods_1xhk1zz['post']['reqBody']; config?: T | undefined }) =>
          fetch<Methods_1xhk1zz['post']['resBody'], BasicHeaders, Methods_1xhk1zz['post']['status']>(
            prefix,
            PATH5,
            POST,
            option,
          )
            .json()
            .then((r) => r.body),
        $path: () => `${prefix}${PATH5}`,
      },
      webhook: {
        post: (option?: { config?: T | undefined } | undefined) =>
          fetch<void, BasicHeaders, Methods_1pyjv5a['post']['status']>(prefix, PATH6, POST, option).send(),
        $post: (option?: { config?: T | undefined } | undefined) =>
          fetch<void, BasicHeaders, Methods_1pyjv5a['post']['status']>(prefix, PATH6, POST, option)
            .send()
            .then((r) => r.body),
        $path: () => `${prefix}${PATH6}`,
      },
    },
    web_comic: {
      _seriesHashedId: (val1: string) => {
        const prefix1 = `${PATH7}/${val1}`;

        return {
          get: (option?: { config?: T | undefined } | undefined) =>
            fetch<Methods_3lerdo['get']['resBody'], BasicHeaders, Methods_3lerdo['get']['status']>(
              prefix,
              prefix1,
              GET,
              option,
            ).json(),
          $get: (option?: { config?: T | undefined } | undefined) =>
            fetch<Methods_3lerdo['get']['resBody'], BasicHeaders, Methods_3lerdo['get']['status']>(
              prefix,
              prefix1,
              GET,
              option,
            )
              .json()
              .then((r) => r.body),
          $path: () => `${prefix}${prefix1}`,
        };
      },
      list: {
        get: (option?: { config?: T | undefined } | undefined) =>
          fetch<Methods_1mcnf0h['get']['resBody'], BasicHeaders, Methods_1mcnf0h['get']['status']>(
            prefix,
            PATH8,
            GET,
            option,
          ).json(),
        $get: (option?: { config?: T | undefined } | undefined) =>
          fetch<Methods_1mcnf0h['get']['resBody'], BasicHeaders, Methods_1mcnf0h['get']['status']>(
            prefix,
            PATH8,
            GET,
            option,
          )
            .json()
            .then((r) => r.body),
        $path: () => `${prefix}${PATH8}`,
      },
    },
    zipcode: {
      get: (option: { query: Methods_y2vsrs['get']['query']; config?: T | undefined }) =>
        fetch<Methods_y2vsrs['get']['resBody'], BasicHeaders, Methods_y2vsrs['get']['status']>(
          prefix,
          PATH9,
          GET,
          option,
        ).json(),
      $get: (option: { query: Methods_y2vsrs['get']['query']; config?: T | undefined }) =>
        fetch<Methods_y2vsrs['get']['resBody'], BasicHeaders, Methods_y2vsrs['get']['status']>(
          prefix,
          PATH9,
          GET,
          option,
        )
          .json()
          .then((r) => r.body),
      $path: (option?: { method?: 'get' | undefined; query: Methods_y2vsrs['get']['query'] } | undefined) =>
        `${prefix}${PATH9}${option && option.query ? `?${dataToURLString(option.query)}` : ''}`,
    },
  };
};

export type ApiInstance = ReturnType<typeof api>;
export default api;
