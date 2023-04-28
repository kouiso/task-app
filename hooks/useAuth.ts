/**
 * 認証機能を提供するhooks
 * @packageDocumentation
 */

import React from 'react'
import { AuthContext } from '../providers/AuthProvider'

export const useAuth = () => {
  const { isSignIn, signIn, signOut } = React.useContext(AuthContext)
  return { isSignIn, signIn, signOut }
}
