import { Navigate, Route, Router, useLocation } from "@solidjs/router";
import type { Component } from "solid-js";
import { Show } from "solid-js";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import BracketView from "./pages/BracketView";
import Contests from "./pages/Contests";
import DivisionParticipants from "./pages/DivisionParticipants";
import Divisions from "./pages/Divisions";
import HeatScoreSheet from "./pages/HeatScoreSheet";
import Login from "./pages/Login";
import Riders from "./pages/Riders";
import Seasons from "./pages/Seasons";

const ProtectedRoute: Component<{ children: any }> = (props) => {
  const auth = useAuth();

  return (
    <Show when={!auth.loading()}>
      <Show when={auth.user()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  );
};

const Root: Component<{ children: any }> = (props) => {
  const location = useLocation();
  if (location.pathname === "/login") {
    return <>{props.children}</>;
  }
  return <Layout>{props.children}</Layout>;
};

const App: Component = () => {
  return (
    <AuthProvider>
      <Router root={Root}>
        <Route path="/login" component={Login} />
        <Route
          path="/"
          component={() => (
            <ProtectedRoute>
              <Seasons />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/seasons/:seasonId/contests"
          component={(props) => (
            <ProtectedRoute>
              <Contests seasonId={props.params.seasonId} />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/seasons/:seasonId/contests/:contestId/divisions"
          component={(props) => (
            <ProtectedRoute>
              <Divisions seasonId={props.params.seasonId} contestId={props.params.contestId} />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/seasons/:seasonId/contests/:contestId/divisions/:divisionId/brackets"
          component={(props) => (
            <ProtectedRoute>
              <BracketView
                seasonId={props.params.seasonId}
                contestId={props.params.contestId}
                divisionId={props.params.divisionId}
              />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/seasons/:seasonId/contests/:contestId/divisions/:divisionId/brackets/:bracketId/heats"
          component={(props) => (
            <ProtectedRoute>
              <BracketView
                seasonId={props.params.seasonId}
                contestId={props.params.contestId}
                divisionId={props.params.divisionId}
                bracketId={props.params.bracketId}
              />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/seasons/:seasonId/contests/:contestId/divisions/:divisionId/brackets/:bracketId/heats/:heatId"
          component={(props) => (
            <ProtectedRoute>
              <HeatScoreSheet
                seasonId={props.params.seasonId}
                contestId={props.params.contestId}
                divisionId={props.params.divisionId}
                bracketId={props.params.bracketId}
                heatId={props.params.heatId}
              />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/riders"
          component={() => (
            <ProtectedRoute>
              <Riders />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/seasons/:seasonId/contests/:contestId/divisions/:divisionId/participants"
          component={(props) => (
            <ProtectedRoute>
              <DivisionParticipants
                seasonId={props.params.seasonId}
                contestId={props.params.contestId}
                divisionId={props.params.divisionId}
              />
            </ProtectedRoute>
          )}
        />
      </Router>
    </AuthProvider>
  );
};

export default App;
