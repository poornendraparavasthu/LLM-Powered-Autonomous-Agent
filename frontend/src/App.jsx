import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";

function App() {
  return (
    <ErrorBoundary>
      <Toaster />
      <Index />
    </ErrorBoundary>
  );
}

export default App;
