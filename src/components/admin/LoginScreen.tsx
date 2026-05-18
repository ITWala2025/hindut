import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/lib/auth'
import {
  ShieldCheck,
  SignIn,
  Eye,
  EyeSlash,
  Warning,
  EnvelopeSimple,
  CheckCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

/**
 * Full-screen admin login. Mirrors the Supabase Auth flows in the spec —
 * email + password tab and a passwordless magic-link tab — plus
 * one-click demo logins for reviewers.
 */
export function LoginScreen() {
  const { login, loginWithMagicLink } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [magicEmail, setMagicEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const submitPassword = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  const submitMagic = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    setLoading(true)
    try {
      setMagicSent(true)
      await loginWithMagicLink(magicEmail)
      toast.success('Check your inbox for a sign-in link.')
    } catch (err) {
      setMagicSent(false)
      setError(err instanceof Error ? err.message : 'Magic link failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-50 via-amber-50 to-orange-100 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        {/* Brand panel */}
        <div className="lg:col-span-2 hidden lg:block">
          <div className="space-y-6">
            <a href="/" aria-label="Go to home page">
              <Logo size="lg" showText={true} />
            </a>
            <h1
              className="text-4xl font-bold text-orange-900"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Admin Console
            </h1>
            <p className="text-orange-800/80 leading-relaxed">
              Manage members, receipts, events and media for the Hindu Association
              of Ireland. Access is restricted to authorised admins and editors.
            </p>
            <div className="rounded-2xl border border-orange-200 bg-white/70 p-5 space-y-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-orange-800 font-semibold">
                <ShieldCheck size={20} weight="duotone" />
                Authorised access only
              </div>
              <p className="text-xs text-muted-foreground">
                Sign in with your admin email and password, or request a magic link.
                Contact the system administrator if you need access.
              </p>
            </div>
          </div>
        </div>

        {/* Login form */}
        <Card className="lg:col-span-3 border-orange-200/60 shadow-2xl shadow-orange-900/10 bg-white/90 backdrop-blur-xl">
          <CardContent className="p-8 md:p-10">
            <div className="lg:hidden mb-6 flex justify-center">
              <a href="/" aria-label="Go to home page">
                <Logo size="md" showText={true} />
              </a>
            </div>
            <div className="mb-6">
              <h2
                className="text-3xl font-bold text-orange-900"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Sign in
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a sign-in method below.
              </p>
            </div>

            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Email & password</TabsTrigger>
                <TabsTrigger value="magic">Magic link</TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-6">
                <form onSubmit={submitPassword} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-orange-800">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@hindut.ie"
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-semibold text-orange-800">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => toast.info('Use the magic-link tab to sign in without a password.')}
                        className="text-xs text-orange-700 hover:text-orange-900 hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative mt-1.5">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-orange-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <Warning size={18} weight="fill" className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold h-11"
                  >
                    <SignIn className="mr-2" weight="bold" />
                    {loading ? 'Signing in…' : 'Sign in'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic" className="mt-6">
                {magicSent && !error ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                    <CheckCircle
                      size={32}
                      weight="fill"
                      className="text-emerald-600 mx-auto mb-2"
                    />
                    <div className="font-semibold text-emerald-900">Check your inbox</div>
                    <p className="text-sm text-emerald-800/80 mt-1">
                      We sent a sign-in link to <strong>{magicEmail}</strong>. In this
                      demo, we'll sign you in automatically in a moment.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submitMagic} className="space-y-5">
                    <div>
                      <Label htmlFor="magic-email" className="text-sm font-semibold text-orange-800">
                        Email
                      </Label>
                      <Input
                        id="magic-email"
                        type="email"
                        autoComplete="email"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder="you@hindut.ie"
                        required
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        We'll email you a one-time link. No password needed.
                      </p>
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold h-11"
                    >
                      <EnvelopeSimple className="mr-2" weight="bold" />
                      {loading ? 'Sending link…' : 'Send magic link'}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="lg:hidden mt-8 pt-6 border-t border-orange-100">
              <p className="text-xs text-muted-foreground text-center">
                Contact the system administrator if you need access.
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Protected portal · Hindu Association of Ireland
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
