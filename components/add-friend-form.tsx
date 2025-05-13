"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogFooter } from "@/components/ui/dialog"

interface AddFriendFormProps {
  onSubmit?: (data: any) => void
}

export function AddFriendForm({ onSubmit }: AddFriendFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    walletAddress: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.name || !formData.email) {
      return
    }

    // Call onSubmit if provided
    if (onSubmit) {
      onSubmit(formData)
    }

    // Reset form
    setFormData({
      name: "",
      email: "",
      walletAddress: "",
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Friend's Name</Label>
          <Input id="name" name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="walletAddress">Crypto Wallet Address (Optional)</Label>
          <Input
            id="walletAddress"
            name="walletAddress"
            placeholder="0x..."
            value={formData.walletAddress}
            onChange={handleChange}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-primary text-white hover:bg-primary/90">
          Add Friend
        </Button>
      </DialogFooter>
    </form>
  )
}
