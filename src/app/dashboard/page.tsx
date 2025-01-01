import { DashboardPage } from "@/components/dashboard-page"
import { db } from "@/db"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { DashboardPageContent } from "./dashboardpagecontent"
import { CreateEventCategoryModal } from "@/components/create-event-category-modal"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

const Page = async () => {
        const auth = await currentUser()
 
        if(!auth) {
            redirect ("/sign-in")
        }

        const user = await db.user.findUnique({
            where: { externalId: auth.id },
        })

        if(!user) {
            redirect ("/sign-up")
        }



    return (
        <DashboardPage cta={<CreateEventCategoryModal>
            <Button className="w-full sm:w-fit">
                <PlusIcon className="size-4 mr-2" />
                Add Category
            </Button>
        </CreateEventCategoryModal>} title="Dashboard">
            <DashboardPageContent />
        </DashboardPage>
    )
}

export default Page