import { getApacQuestions, getPublicFormConfig } from "../actions";
import ApacTestClient from "./ApacTestClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "APAC Test — Radical Portal",
};

export default async function ApacTestPage() {
  const [questions, formConfig] = await Promise.all([
    getApacQuestions(),
    getPublicFormConfig(),
  ]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Background blobs */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Smaragd — top left */}
        <div style={{
          position: "absolute", top: "-20%", left: "-10%",
          width: "65%", height: "65%",
          background: "radial-gradient(ellipse at center, rgba(46,213,115,0.20) 0%, rgba(46,213,115,0.07) 40%, transparent 65%)",
          filter: "blur(60px)",
          willChange: "filter",
        }} />
        {/* Coral — bottom right */}
        <div style={{
          position: "absolute", bottom: "-20%", right: "-10%",
          width: "70%", height: "70%",
          background: "radial-gradient(ellipse at center, rgba(230,115,79,0.16) 0%, rgba(230,115,79,0.05) 40%, transparent 65%)",
          filter: "blur(72px)",
          willChange: "filter",
        }} />
        {/* Smaragd accent — top right */}
        <div style={{
          position: "absolute", top: "5%", right: "0%",
          width: "35%", height: "40%",
          background: "radial-gradient(ellipse at center, rgba(46,213,115,0.09) 0%, transparent 60%)",
          filter: "blur(48px)",
          willChange: "filter",
        }} />
        {/* Dot pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
      </div>

      {/* Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <ApacTestClient questions={questions} formConfig={formConfig} />
        </div>
      </main>
    </div>
  );
}
