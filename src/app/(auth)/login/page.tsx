import { LoginForm } from './LoginForm'

type Props = {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams

  return <LoginForm redirectTo={redirectTo} />
}
