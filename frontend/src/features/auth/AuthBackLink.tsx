import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function AuthBackLink() {
  return (
    <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-verde hover:text-verde-forte">
      <ArrowLeft size={16} strokeWidth={2} aria-hidden />
      Voltar para o login
    </Link>
  );
}
