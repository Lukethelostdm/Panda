import { REST } from "@discordjs/rest"
import {
    RESTPostAPIChannelMessageResult,
    RESTPostAPICurrentUserCreateDMChannelResult,
    Routes,
    APIEmbed,
} from "discord-api-types/v10"


export class DiscordClient {
    private rest: REST

    constructor(token: string | undefined) {
        this.rest = new REST({ version: "10" }).setToken(token ?? "")
    }

    async createDM(userID: string): Promise<RESTPostAPICurrentUserCreateDMChannelResult> {
        return this.rest.post(Routes.userChannels(), {
            body: {
                recipient_id: userID,
            }
        }) as Promise<RESTPostAPICurrentUserCreateDMChannelResult>
    }

    async sendEmbed(channelID: string, embed: APIEmbed): Promise<RESTPostAPIChannelMessageResult> {
        return this.rest.post(Routes.channelMessages(channelID), {
            body: { embeds: [embed] },
        }) as Promise<RESTPostAPIChannelMessageResult>
    }
}