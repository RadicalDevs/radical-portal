import { getFormConfig } from "../../actions";
import { getApacQuestions } from "@/app/apac/actions";
import IntroPreviewPage from "./IntroPreviewPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview — APAC Test" };

export default async function ApacFormPreviewPage() {
  const [config, questions] = await Promise.all([
    getFormConfig(),
    getApacQuestions(),
  ]);
  return <IntroPreviewPage config={config} questions={questions} />;
}
