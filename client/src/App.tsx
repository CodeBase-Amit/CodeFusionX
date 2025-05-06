import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
import Toast from "./components/toast/Toast"
import EditorPage from "./pages/EditorPage"
import HomePage from "./pages/HomePage"
import { MediasoupProvider } from "./context/MediasoupContext"

const App = () => {
    return (
        <>
            <Router>
                <MediasoupProvider>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/editor/:roomId" element={<EditorPage />} />
                    </Routes>
                </MediasoupProvider>
            </Router>
            <Toast /> {/* Toast component from react-hot-toast */}
        </>
    )
}

export default App
