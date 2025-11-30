import tableyLogo from "@/assets/tabley-logo.png";

export const Footer = () => {
  return (
    <footer className="w-full py-6 mt-8">
      <div className="flex items-center justify-center gap-2">
        <img src={tableyLogo} alt="Tabley Logo" className="h-5 w-auto" />
        <span className="text-white font-visby">
          Powered by <span className="font-visby-bold font-bold">Tabley</span>
        </span>
      </div>
    </footer>
  );
};
