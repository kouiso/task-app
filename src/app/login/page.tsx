import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import LoginForm from '../../components/auth/LoginForm'
import { authOptions } from '../../server/auth'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/')
  }

  return <LoginForm />
}
