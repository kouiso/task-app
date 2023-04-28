/**
 * 認証機能Provider
 * @packageDocumentation
 */

import { useRouter } from 'next/router'
import React from 'react'

export const AuthContext = React.createContext({
  isSignIn: false,
  signIn: () => {},
  signOut: () => {},
})

interface AuthProviderProps {
  children: JSX.Element
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { replace } = useRouter()
  const [isSignIn, setSiginIn] = React.useState(false)

  /**
   * サインイン
   */
  const signIn = () => {
    setSiginIn(true)
    replace('/')
  }

  /**
   * サインアウト
   */
  const signOut = () => {
    setSiginIn(false)
    replace('/login')
  }

  return (
    <AuthContext.Provider value={{ isSignIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
