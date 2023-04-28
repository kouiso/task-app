/**
 * 認証
 * @packageDocumentation
 */

import React from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../../hooks/useAuth'

interface AuthProps {
  children: JSX.Element
}

export const Auth: React.FC<AuthProps> = ({ children }) => {
  const { isReady, replace } = useRouter()
  const { isSignIn } = useAuth()

  // useEffect内でしかisReadyを参照できないため
  // この中で認証チェックする
  React.useEffect(() => {
    if (!isReady) return

    // 未認証であればログイン画面へ
    if (!isSignIn) {
      replace('/login')
    }

    // 依存配列の編集禁止
  }, [isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  return isSignIn ? children : <></>
}
