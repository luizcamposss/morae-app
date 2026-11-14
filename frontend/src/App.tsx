import { AppRouter } from "./app/AppRouter";
import { UpdatePrompt } from "./shared/components/UpdatePrompt";

export default function App() {
  return (
    <>
      <AppRouter />
      <UpdatePrompt />
    </>
  );
}
