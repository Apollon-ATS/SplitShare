"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogFooter } from "@/components/ui/dialog"

interface AddSubscriptionFormProps {
  onSubmit?: (data: any) => void
}

export function AddSubscriptionForm({ onSubmit }: AddSubscriptionFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    cost: "",
    billingDate: "",
    type: "monthly",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.name || !formData.cost || !formData.billingDate) {
      return
    }

    // Call onSubmit if provided
    if (onSubmit) {
      onSubmit(formData)
    }

    // Reset form
    setFormData({
      name: "",
      cost: "",
      billingDate: "",
      type: "monthly",
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Subscription Name</Label>
          <Input id="name" name="name" placeholder="Netflix" value={formData.name} onChange={handleChange} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cost">Monthly Cost</Label>
          <Input
            id="cost"
            name="cost"
            type="number"
            placeholder="15.99"
            value={formData.cost}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="billingDate">Billing Date</Label>
          <Input
            id="billingDate"
            name="billingDate"
            type="date"
            value={formData.billingDate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="type">Billing Cycle</Label>
          <Select onValueChange={handleSelectChange} defaultValue={formData.type}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select billing cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-primary text-white hover:bg-primary/90">
          Add Subscription
        </Button>
      </DialogFooter>
    </form>
  )
}
