import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import Accounnts from "./pages/Accounnts";
import Aicomposer from "./pages/Aicomposer";
import Scheduler from "./pages/Scheduler";
import Layout from "./components/Layout";
import { Toaster } from "react-hot-toast";
export default function App() {
    return (
        <>
            <Toaster position="top-right"/>
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
