import { toast } from 'react-toastify';

import FirebaseUtilAuth from '@/interface/firebase-auth';

/**
 * Authクラスは、認証機能を提供します。
 */
class Auth extends FirebaseUtilAuth {
  /**
   * signInWithProviderメソッドは、指定されたプロバイダ名を使用してサインインします。
   * @param providerName 'google'または'twitter'のいずれかの文字列
   * @throws {Error} 無効なプロバイダ名が指定された場合
   */
  static async signInWithProvider(providerName: 'google' | 'x') {
    return super.signInWithProvider(providerName);
  }

  /**
   * getCurrentUserメソッドは、現在の認証状態を取得します。
   * @returns 現在のユーザー情報
   */
  static async getCurrentUser() {
    try {
      return await super.getCurrentUser();
    } catch (error) {
      toast.error('処理が失敗しました');
      console.error(error);
      return null;
    }
  }
}

export default Auth;
