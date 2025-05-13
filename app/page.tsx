import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link className="flex items-center justify-center gap-2" href="#">
          <div className="logo-circle h-10 w-10">
            <Image src="/images/ats-logo.png" alt="ATS Logo" width={32} height={32} className="object-contain" />
          </div>
          <span className="font-bold text-xl ats-accent">ATS</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium text-gray-600 hover:text-gray-900" href="/dashboard">
            Dashboard
          </Link>
          <Link className="text-sm font-medium text-gray-600 hover:text-gray-900" href="/login">
            Login
          </Link>
        </nav>
      </header>
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 geometric-bg"></div>
        <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="logo-circle h-16 w-16">
                      <Image
                        src="/images/ats-logo.png"
                        alt="ATS Logo"
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tighter ats-accent">ATS</h1>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none ats-accent">
                    Split Subscriptions with Friends Using Crypto
                  </h2>
                  <p className="max-w-[600px] text-gray-600 md:text-xl">
                    Easily manage and split your Netflix, Disney+, and other subscription costs with friends using
                    cryptocurrency payments.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-primary text-white hover:bg-primary/90">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative mx-auto aspect-video overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="logo-circle h-32 w-32">
                    <Image
                      src="/images/ats-logo.png"
                      alt="ATS Logo"
                      width={96}
                      height={96}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent"></div>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="relative w-full py-12 md:py-24 lg:py-32 bg-accent">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl ats-accent">How It Works</h2>
                <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Split your subscription costs with friends in three simple steps
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full ats-bg text-white">1</div>
                <h3 className="text-xl font-bold ats-accent">Add Your Subscription</h3>
                <p className="text-gray-600">Enter your Netflix or other subscription details and monthly cost.</p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full ats-bg text-white">2</div>
                <h3 className="text-xl font-bold ats-accent">Invite Friends</h3>
                <p className="text-gray-600">Add friends to your subscription group and set how the cost is split.</p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full ats-bg text-white">3</div>
                <h3 className="text-xl font-bold ats-accent">Collect Payments</h3>
                <p className="text-gray-600">Friends pay their share using cryptocurrency, with automatic reminders.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t ats-bg">
        <div className="flex items-center gap-2">
          <div className="logo-circle h-8 w-8">
            <Image src="/images/ats-logo.png" alt="ATS Logo" width={24} height={24} className="object-contain" />
          </div>
          <p className="text-xs text-white">© 2024 ATS. All rights reserved.</p>
        </div>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs text-white/80 hover:text-white" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs text-white/80 hover:text-white" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
