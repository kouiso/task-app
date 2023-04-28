/**
 * ログイン画面のコントローラ
 * @packageDocumentation
 */

import { useAuth } from 'hooks/useAuth'

/**
 * useControllerの定義
 */
const useController = () => {
  const { signIn } = useAuth()

  /**
   * ログイン実行
   */
  const handleLogin = () => {
    signIn()
  }

  return { handleLogin }
}

export default useController
