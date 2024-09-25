
import { IconSun, IconMoon, IconSunMoon } from '@tabler/icons-react';

 
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { Label } from '@/components/ui/label';
import { Theme, useTonConnectUI } from '@tonconnect/ui-react';
import { ThemeType, useTheme } from '@/components/theme';
import { useTranslation } from '@/components/lang';
 
export function DropMenuSwitchTheme() {
  const { translations: T } = useTranslation();
  const { theme, setTheme } = useTheme()
  const [, setOptions] = useTonConnectUI();
  function changeTheme(theme: ThemeType){
      setTheme(theme)
      setOptions({ uiPreferences: {theme: theme.toUpperCase() as Theme}});
  }

  function iconTheme(theme: ThemeType){
    switch (theme) {
      case 'light':
          return {btn: 'ghost', icon: <IconSun className='w-4 h-4'/>, label: <Label className='pl-2 truncate'>{T.light}</Label>}
        break;
      case 'dark':
        return {btn: 'ghost', icon: <IconMoon className='w-4 h-4'/>, label: <Label className='pl-2 truncate'>{T.dark}</Label>}
        break;
      case 'system':
        return {btn: 'secondary', icon: <IconSunMoon className='w-4 h-4'/>, label: <Label className='pl-2 truncate'>{T.system}</Label>}
        break;
      default:
        return {btn: 'secondary', icon: <IconSunMoon className='w-4 h-4'/>, label: <Label className='pl-2 truncate'>{T.system}</Label>}
        break;
    }
  };
  

  type varianttype = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
 
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={iconTheme(theme as ThemeType).btn as varianttype}>{iconTheme(theme as ThemeType).icon}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent >
        <DropdownMenuItem onSelect={() => changeTheme('light' as ThemeType)}>
          <div className='flex py-0.5 px-0.5'>
            {iconTheme('light' as ThemeType).icon}
            {iconTheme('light' as ThemeType).label}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => changeTheme('dark' as ThemeType)}>
          <div className='flex py-0.5 px-0.5'>
            {iconTheme('dark' as ThemeType).icon}
            {iconTheme('dark' as ThemeType).label}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => changeTheme('system' as ThemeType)}>
          <div className='flex py-0.5 px-0.5'>
            {iconTheme('system' as ThemeType).icon}
            {iconTheme('system' as ThemeType).label}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}