import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";

import Dashboard from "./pages/dashboard";
import Accounnts from "./pages/Accounnts";
import Aicomposer from "./pages/aiComposer";
import Scheduler from "./pages/scheduler";
import Layout from "./components/layout";

export default function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route element={<Layout/>}>
                    <Route path="/dashboard" element={<Dashboard/>}/>
                    <Route path="/accounts" element={<Accounnts/>}/>
                    <Route path="/ai-composer" element={<Aicomposer/>}/>
                    <Route path="/schedule" element={<Scheduler/>}/>
                </Route>
            </Routes>
        </>
    );
}
