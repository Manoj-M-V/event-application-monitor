"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

export const AccountSettings = ({
  discordId: initialDiscordId,
  businessDescription: initialBusinessDescription,
}: {
  discordId: string
  businessDescription: string
}) => {
  const [discordId, setDiscordId] = useState(initialDiscordId)
  const [businessDescription, setBusinessDescription] = useState(initialBusinessDescription)

  const updateDiscordId = useMutation({
    mutationFn: async (discordId: string) => {
      const res = await client.project.setDiscordID.$post({ discordId })
      return await res.json()
    },
  })

  const updateBusinessDescription = useMutation({
    mutationFn: async (businessDescription: string) => {
      const res = await client.project.setBusinessDescription.$post({ businessDescription })
      return await res.json()
    },
  })

  return (
    <Card className="max-w-xl w-full space-y-6">
      <div className="pt-2">
        <Label>Discord ID</Label>
        <Input
          className="mt-1"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          placeholder="Enter your Discord ID"
        />
        <p className="mt-2 text-sm/6 text-gray-600">
          Don't know how to find your Discord ID?{" "}
          <Link href="#" className="text-brand-600 hover:text-brand-500">
            Learn how to obtain it here
          </Link>
          .
        </p>
        <div className="pt-4">
          <Button 
            onClick={() => updateDiscordId.mutate(discordId)} 
            disabled={updateDiscordId.isPending}
          >
            {updateDiscordId.isPending ? "Saving..." : "Save Discord ID"}
          </Button>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Label>Business Description</Label>
        <p className="mt-1 text-sm text-gray-600">
          Describe your business to help our AI better understand your context and provide more accurate insights.
        </p>
        <textarea
          className="mt-2 w-full min-h-[120px] px-3 py-2 rounded-md border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
          placeholder="Describe your business, products, services, and target audience..."
        />
        <div className="mt-4">
          <Button 
            onClick={() => updateBusinessDescription.mutate(businessDescription)}
            disabled={updateBusinessDescription.isPending}
          >
            {updateBusinessDescription.isPending ? "Saving..." : "Save Business Description"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
