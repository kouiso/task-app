import type { User, UserCredential } from '@/lib/firebase';
import { GoogleAuthProvider, TwitterAuthProvider, auth, signInWithPopup } from '@/lib/firebase';

type ProviderName = 'google' | 'x';

/**
 * FirebaseAuthクラスは、Firebaseの認証機能を提供します。
 */
class FirebaseAuth {
  /**
   * signInWithProviderメソッドは、指定されたプロバイダ名を使用してサインインします。
   * @param providerName 'google'または'twitter'のいずれかの文字列
   * @throws {Error} 無効なプロバイダ名が指定された場合
   */
  static async signInWithProvider(providerName: ProviderName): Promise<UserCredential | undefined> {
    const provider = FirebaseAuth.getProvider(providerName);
    return signInWithPopup(auth, provider);
  }

  /**
   * getProviderメソッドは、指定されたプロバイダ名に対応する認証プロバイダオブジェクトを返します。
   * @param providerName 'google'または'twitter'のいずれかの文字列
   * @returns {GoogleAuthProvider | TwitterAuthProvider} 認証プロバイダオブジェクト
   * @throws {Error} 無効なプロバイダ名が指定された場合
   */
  static getProvider(providerName: ProviderName) {
    switch (providerName) {
      case 'google':
        return new GoogleAuthProvider();
      case 'x':
        return new TwitterAuthProvider();
      default:
        throw new Error('Invalid provider');
    }
  }

  /**
   * getCurrentUserメソッドは、現在の認証状態を取得します。
   * @returns 現在のユーザー情報
   */
  static getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      auth.onAuthStateChanged((user) => {
        resolve(user);
      });
    });
  }
}

export { FirebaseAuth };
