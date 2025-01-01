import { FREE_QUOTA, PRO_QUOTA } from "@/config";
import { db } from "@/db";
import { DiscordClient } from "@/lib/discordclient";
import { CATEGORY_NAME_VALIDATOR } from "@/lib/validators/category-validator";
import { NextRequest, NextResponse } from "next/server";
import { title } from "process";
import { z } from "zod";


const REQUEST_VALIDATOR = z.object({
    category: CATEGORY_NAME_VALIDATOR,
    fields: z.record(z.string().or(z.number()).or(z.boolean())).optional(),
    description: z.string().optional(),
})
    .strict()

export const POST = async (req: NextRequest) => {
    try {
        const authHeader = req.headers.get("Authorization")

        if (!authHeader) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
        }


        if (!authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ message: "Invalid Auth Header Format. Expected: 'Bearer [API_KEY]'" }, { status: 401 })
        }

        const apiKey = authHeader.split(" ")[1]

        if (!apiKey || apiKey.trim() === "") {
            return NextResponse.json({ message: "Invalid API Key" }, { status: 401 })
        }


        const user = await db.user.findUnique({
            where: { apiKey },
            include: { EventCategories: true },
        })

        if (!user) {
            return NextResponse.json({ message: "Invalid API Key" }, { status: 401 })
        }

        if (!user.discordId) {
            return NextResponse.json(
                {
                    message: "Please enter a discord ID in your account settings."
                },
                { status: 403 }
            )
        }

        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1
        const currentYear = currentDate.getFullYear()

        const quota = await db.quota.findUnique({
            where: {
                userId: user.id,
                month: currentMonth,
                year: currentYear
            },
        })

        const quotaLimit = user.plan === "FREE" ? FREE_QUOTA.maxEventsPerMonth : PRO_QUOTA.maxEventsPerMonth

        if (quota && quota.count >= quotaLimit) {
            return NextResponse.json({
                message:
                    "Your monthly quota has been reached. Please upgrade your plan for more events."
            },
                { status: 429 }
            )
        }


        const discord = new DiscordClient(process.env.DISCORD_BOT_TOKEN)

        const dmChannel = await discord.createDM(user.discordId)

        let requestData: unknown

        try {
            requestData = await req.json()
        } catch (err) {
            return NextResponse.json({
                message: "Invalid JSON Request Body",

            },
                { status: 400 }
            )
        }

        const validationResult = REQUEST_VALIDATOR.parse(requestData)

        const category = user.EventCategories.find((cat) => cat.name === validationResult.category)

        if (!category) {
            return NextResponse.json({
                message: `You do not have a category named "${validationResult.category}"`,
            },
                { status: 404 }
            )
        }

        const eventData = {
            title: `${category.emoji || "🔔"}  ${category.name.charAt(0).toUpperCase() + category.name.slice(1)}  `,
            desciption: validationResult.description || `A new ${category.name} event has occured!`,
            color: category.color,
            timestamp: new Date().toISOString(),
            fields: Object.entries(validationResult.fields || {}).map(([key, value]) => {
                return {
                    name: key,
                    value: String(value),
                    inline: true,
                }
            })
        }

        const event = await db.event.create({
            data: {
                name: category.name,
                formattedMessage: `${eventData.title}\n\n${eventData.desciption}`,
                userId: user.id,
                fields: validationResult.fields || {},
                eventCategoryId: category.id
            }
        })

        try {
            await discord.sendEmbed(dmChannel.id, eventData)

            await db.event.update({
                where: { id: event.id },
                data: { deliveryStatus: "DELIVERED" }
            })

            await db.quota.upsert({
                where: { userId: user.id, month: currentMonth, year: currentYear },
                update: { count: { increment: 1 } },
                create: {
                    userId: user.id,
                    month: currentMonth,
                    year: currentYear,
                    count: 1,
                },
            })
        } catch (err) {
            await db.event.update({
                where: { id: event.id },
                data: { deliveryStatus: "FAILED" }
            })

            console.log(err)

            return NextResponse.json({
                message: "Error Processing Event",
                eventId: event.id,
            },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: "Event Processed Successfully",
            eventId: event.id,
        })


    } catch (err) {
        console.error(err)


        if (err instanceof z.ZodError) {
            return NextResponse.json({ message: err.message }, { status: 422 })
        }

        return NextResponse.json({ message: "Internal Server Error" },
            { status: 500 }
        )
    }
}