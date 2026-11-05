import { createBrowserRouter, RouterProvider } from "react-router";
import { DevGallery } from "../routes/DevGallery";
import { JoinPage } from "../routes/JoinPage";
import { NotFound } from "../routes/NotFound";
import { RoomPage } from "../routes/RoomPage";
import { SetupPage } from "../routes/SetupPage";

const router = createBrowserRouter([
  { path: "/", element: <SetupPage /> },
  { path: "/join/:code", element: <JoinPage /> },
  { path: "/room/:code", element: <RoomPage /> },
  { path: "/dev", element: <DevGallery /> },
  { path: "*", element: <NotFound /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
