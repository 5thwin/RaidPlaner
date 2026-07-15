import './index.css'
import App from './App.tsx'

import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RosterPage } from "@/pages/RosterPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { GuildDetailPage } from "@/pages/GuildDetailPage";
import { JoinGuildPage } from "@/pages/JoinGuildPage";
import { GuildCalendarPage } from "@/pages/GuildCalendarPage";
import { GuildPartyMembersPage } from "@/pages/GuildPartyMembersPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<App />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/guilds/join" element={<JoinGuildPage />} />
            <Route path="/guilds/:guildId" element={<GuildDetailPage />} />
            <Route
              path="/guilds/:guildId/calendar"
              element={<GuildCalendarPage />}
            />
            <Route
              path="/guilds/:guildId/members"
              element={<GuildPartyMembersPage />}
            />
            {/* 정의되지 않은 모든 경로("/foo", 오타 등)는 빈 화면 대신 404 안내로 보낸다. */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>,
)
