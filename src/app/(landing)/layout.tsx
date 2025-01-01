import { ReactNode } from "react";
import { NavBar } from "../../components/navbar";

const Layout = ({children}: {children: ReactNode}) => {
    return (
        <>
            <NavBar/>
            {children}
        </>
    )
}

export default Layout;