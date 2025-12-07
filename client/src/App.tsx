import { Route, Switch } from "wouter";
import { RunListPage } from "./pages/RunList";
import { RunReviewPage } from "./pages/RunReview";
import { RunDetailPage } from "./pages/RunDetail";
import { AnimalHistoryPage } from "./pages/AnimalHistory";
import { PicSearchDemo } from "./pages/PicSearchDemo";

export function App() {
  return (
    <Switch>
      <Route path="/" component={RunListPage} />
      <Route path="/runs" component={RunListPage} />
      <Route path="/runs/:runId/review" component={RunReviewPage} />
      <Route path="/runs/:runId" component={RunDetailPage} />
      <Route path="/animals/:animalId" component={AnimalHistoryPage} />
      <Route path="/pic-search" component={PicSearchDemo} />
      <Route>
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold">404</h1>
            <p className="text-slate-400">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
