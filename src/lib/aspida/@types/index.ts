/* eslint-disable */
export type ErrorResponseDto = {
  statusCode: number;
  message: string;
  error: string;
};

export type ResponseDto = {};

export type GetZipcodeOutputDto = {
  /** 郵便番号 */
  zipCode: string;
  /** 都道府県 */
  prefecture: string;
  /** 市区町村名 */
  cityName: string;
  /** 住所テキスト */
  address: string;
};

export type CreateAddressInputDto = {
  /** 住所の種類 */
  type: number;
  /** 住所所有者の姓 */
  lastName: string;
  /** 住所所有者の名 */
  firstName: string;
  /** 姓のカナ */
  lastNameKana: string;
  /** 名のカナ */
  firstNameKana: string;
  /** 都道府県 */
  prefecture: string;
  /** 郵便番号 */
  zipCode: string;
  /** 市区町村名 */
  cityName: string;
  /** 住所 */
  address: string;
  /** 詳細住所 */
  addressDetail?: string | undefined;
  /** 電話番号 */
  phoneNumber: string;
};

export type FindOneAddressOutputDto = {
  /** ID */
  id: number;
  /** 姓 */
  lastName: string;
  /** 名 */
  firstName: string;
  /** 姓（カナ） */
  lastNameKana: string;
  /** 名（カナ） */
  firstNameKana: string;
  /** 都道府県 */
  prefecture: string;
  /** 郵便番号 */
  zipCode: string;
  /** 市区町村名 */
  cityName: string;
  /** 住所 */
  address: string;
  /** 住所詳細 */
  addressDetail: string;
  /** 電話番号 */
  phoneNumber: string;
};

export type FindManyAddressOutputDto = {
  /** ID */
  id: number;
  /** 姓 */
  lastName: string;
  /** 名 */
  firstName: string;
  /** 姓(カナ) */
  lastNameKana: string;
  /** 名(カナ) */
  firstNameKana: string;
  /** 郵便番号 */
  zipCode: string;
  /** 都道府県 */
  prefecture: string;
  /** 市区町村 */
  cityName: string;
  /** 町名・番地 */
  address: string;
  /** 建物名 */
  addressDetail: string;
  /** 電話番号 */
  phoneNumber: string;
};

export type UpdateAddressDto = {};

export type CreatePaymentIntentOutputDto = {
  /** クライアントシークレット */
  clientSecret: string;
};

export type CreatePaymentIntentInputDto = {
  /** 注文者住所ID */
  orderAddressId: number;
  /** 配送先住所ID */
  destinationAddressId: number;
  /** 注文ハッシュID */
  orderHashedId: string;
};

export type CheckPaymentOutputDto = {
  /** 購入ステータス（成功をまだ受け取っていない=0、成功を受け取った=1）。 */
  isComplete: number;
};

export type CheckPaymentInputDto = {
  /** 注文ハッシュID */
  orderHashedId: string;
};

export type GetComicListOutputDto = {
  /** 注文ハッシュID */
  orderHashedId: string;
  /** タイトル */
  orderTitle: string;
  /** 購入日時 */
  purchaseTime: string;
  /** 購入経路 */
  purchaseRoute: string;
  /** 支払額 */
  allPrice: string;
  /** 注文ステータス */
  orderStatus: string;
  /** 発送予定日 */
  sendDueDateYMD: string;
  /** 到着予定日 */
  arrivalDueDateYMD: string;
};

export type FindOneWebComicOutputDto = {
  /** Comic Object JSON */
  comicObjectJson: string;
  /** 注文ハッシュID */
  orderHashedId: string;
  /** タイトル */
  title: string;
  /** 作品数 */
  workCount: number;
  /** 作品が描かれたページ数 */
  pagesCount: number;
  /** 配送日 */
  deliveryDate: string;
  /** 到着予定日 */
  estimatedArrivalDate: string;
  /** 送料 */
  shippingCost: number;
  /** 商品代金 */
  productPrice: number;
  /** 合計 */
  totalPrice: number;
};
