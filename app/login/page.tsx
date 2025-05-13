import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PhantomLogin } from "@/components/phantom-login"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 relative">
      <div className="absolute inset-0 geometric-bg"></div>
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center flex flex-col items-center">
          <div className="logo-circle h-20 w-20 mb-2">
            <Image src="/images/ats-logo.png" alt="ATS Logo" width={60} height={60} className="object-contain" />
          </div>
          <h1 className="text-3xl font-bold ats-accent">ATS</h1>
          <p className="mt-2 text-gray-600">Split subscription costs with friends using crypto</p>
        </div>
        <Tabs defaultValue="wallet" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white">
            <TabsTrigger value="wallet" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Wallet
            </TabsTrigger>
            <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Register
            </TabsTrigger>
          </TabsList>
          <TabsContent value="wallet">
            <PhantomLogin />
          </TabsContent>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Enter your email and password to access your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" placeholder="name@example.com" type="email" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link className="text-sm text-primary hover:text-primary/80" href="#">
                      Forgot password?
                    </Link>
                  </div>
                  <Input id="password" type="password" required />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-primary text-white hover:bg-primary/90">Login</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Enter your information to create an account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" placeholder="name@example.com" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wallet">Crypto Wallet Address (Optional)</Label>
                  <Input id="wallet" placeholder="0x..." />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-primary text-white hover:bg-primary/90">Create Account</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
