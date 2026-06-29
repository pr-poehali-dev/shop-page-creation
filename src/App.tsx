
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ClientCard from "./pages/ClientCard";
import VisitDetail from "./pages/VisitDetail";
import MyVisits from "./pages/cabinet/MyVisits";
import MyPhotos from "./pages/cabinet/MyPhotos";
import MyRecommendations from "./pages/cabinet/MyRecommendations";
import CabinetVisit from "./pages/cabinet/CabinetVisit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/client/:id" element={<ClientCard />} />
          <Route path="/client/:id/visit/:visitId" element={<VisitDetail />} />
          <Route path="/cabinet" element={<MyVisits />} />
          <Route path="/cabinet/photos" element={<MyPhotos />} />
          <Route path="/cabinet/recommendations" element={<MyRecommendations />} />
          <Route path="/cabinet/visit/:visitId" element={<CabinetVisit />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;