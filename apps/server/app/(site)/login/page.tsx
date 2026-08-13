import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center">加载中…</p>}>
      <LoginForm />
    </Suspense>
  );
}
