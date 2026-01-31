import { useTranslation } from "@/components/lang";
import { Button } from "@/components/ui/button";

const telegramUrl = "https://t.me/forcebear";
const githubUrl = import.meta.env.VITE_GITHUB_URL || "https://github.com";
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const isTestnet = import.meta.env.VITE_IS_TESTNET === "true" || import.meta.env.VITE_TON_NETWORK === "testnet";
const contractBaseUrl = isTestnet ? "https://testnet.tonviewer.com/" : "https://tonviewer.com/";
const contractUrl = contractAddress ? `${contractBaseUrl}${contractAddress}` : contractBaseUrl;

const GitHubIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12 2C6.477 2 2 6.486 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.004.07 1.532 1.03 1.532 1.03.892 1.53 2.341 1.088 2.91.833.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.112-4.555-4.945 0-1.091.39-1.984 1.03-2.683-.103-.253-.447-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.56 9.56 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.699 1.028 1.592 1.028 2.683 0 3.842-2.338 4.688-4.566 4.936.36.31.68.92.68 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.486 17.523 2 12 2z" />
  </svg>
);

const ChainIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 13.5l3-3" />
    <path d="M7 17a4 4 0 0 1 0-5.657l2.343-2.343a4 4 0 0 1 5.657 0" />
    <path d="M17 7a4 4 0 0 1 0 5.657l-2.343 2.343a4 4 0 0 1-5.657 0" />
  </svg>
);

const TelegramIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M22 4.01c0-.93-.9-1.58-1.78-1.24L2.75 9.77c-1.05.42-.98 1.94.1 2.26l4.6 1.34 1.84 5.52c.28.84 1.34 1.06 1.93.41l2.68-2.96 5.42 3.97c.74.54 1.79.12 1.98-.78L22 4.01zM9.6 13.37l7.74-6.53c.36-.3.88.17.55.5l-6.58 6.32-.26 3.68-1.42-4.29-3.35-.98 3.32-1.33z" />
  </svg>
);

export default function Footer() {
  const { translations: T } = useTranslation();
  const isMobile = window.innerWidth <= 768;

  return (
    <footer className="w-full mt-4">
      <div className="relative flex flex-col rounded-[25px] overflow-hidden bg-[hsla(var(--main-col-bg)/1)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 text-sm">
          <div className={"mx-3 my-3 text-left text-[hsla(var(--foreground)/0.7)] text-family-['Inter',sans-serif] text-sm font-medium select-none" + (isMobile ? " text-center" : "")}>
            CoinFlip TON network © 2026. {T.footerMadeWith} <span role="img" aria-label="love">{"\u2764\uFE0F"}</span>
          </div>
          <div className="flex justify-center sm:justify-end gap-2 flex-wrap">
            <Button asChild variant="ghost" className="all-games-btn">
              <a href={contractUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <ChainIcon className="h-4 w-4" />
                <span>{T.contractButton}</span>
              </a>
            </Button>
            <Button asChild variant="ghost" className="all-games-btn">
              <a href={telegramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <TelegramIcon className="h-4 w-4" />
                <span>{T.telegramButton}</span>
              </a>
            </Button>
            <Button asChild variant="ghost" className="all-games-btn">
              <a href={githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <GitHubIcon className="h-4 w-4" />
                <span>{T.githubButton}</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
