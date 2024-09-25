

import ReactCountryFlag from "react-country-flag"
 
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Locales, useTonConnectUI } from "@tonconnect/ui-react";
import { useTranslation } from "@/components/lang";
 
export function DropMenuSwitchLang() {

  const { locale, setLocale } = useTranslation();
  const [,setOptions] = useTonConnectUI();
  const { translations: T } = useTranslation();
  const handleTrans = (locale: 'en' | 'ru') => {
    const newLocale = locale as 'en' | 'ru';
    setLocale(newLocale as 'en' | 'ru')
    setOptions({ language: newLocale as  'en' | 'ru' });
    localStorage.setItem('lang', newLocale);
  };


  function iconLang(lang: 'en' | 'ru'){
    switch (lang) {
      case 'ru':
          return {text: <Label className="truncate">{T.rus}</Label>,
              icon: <ReactCountryFlag countryCode="RU" svg style={{
                width: '1rem',
                height: '1rem',
                margin: '0 0 0 0'
            }} title="RU"/>
          }
        break;
      case 'en':
          return {text: <Label className="truncate">{T.eng}</Label>,
              icon: <ReactCountryFlag countryCode="GB" svg style={{
                width: '1rem',
                height: '1rem',
                margin: '0 0 0 0'
            }} title="GB"/>
          }
        break;
      default:
        return {text: <Label className="truncate">{T.eng}</Label>,
          icon: <ReactCountryFlag countryCode="GB" svg style={{
            width: '1rem',
            height: '1rem',
            margin: '0 0.5rem 0 0'
        }} title="GB"/>
      }
        break;
    }
  };
 
  return (
    <DropdownMenu >
      <DropdownMenuTrigger  asChild>
        <Button className="w-max" variant="ghost">
          {iconLang(locale).icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="width-min">
          <DropdownMenuItem className="" onSelect={() => handleTrans("ru")}>
              <div className="flex justify-start w-full py-0.5 gap-2 w-full">
                {iconLang('ru').icon}
                {iconLang('ru').text}
              </div>
            </DropdownMenuItem>
          <DropdownMenuItem className="" onSelect={() => handleTrans("en")}>
            <div className="flex justify-start w-full py-0.5 gap-2 w-full">
                {iconLang('en').icon}
                {iconLang('en').text}
              </div>
            </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}