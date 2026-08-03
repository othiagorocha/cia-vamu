# Design — CIA VAMU

## Logo

Monocromática: fundo **preto**, anel e seta **brancos**, seta com pontas arredondadas.  
Isso define alto contraste e cantos arredondados na UI.

## Paleta

| Papel | Valor |
|-------|--------|
| Primary / marca / fundos escuros | Preto `#000000` |
| Contraste / texto em dark / ícones no mark | Branco `#FFFFFF` |
| Superfícies claras | Branco / off-white |
| Texto secundário (muted) | Cinzas neutros (zinc/neutral) |
| Bordas (light) | Cinza claro |
| Bordas (dark) | Cinza escuro |
| Alertas / highlights / badges de destaque / toasts de atenção | Tailwind **`orange-400`** (`#fb923c`) |
| Destructive / erros | Vermelho padrão shadcn (`destructive`) |

## Tokens no tema (orientação)

Em `globals.css` / tema shadcn:

- `--primary` → preto (botões principais, header dark)  
- `--primary-foreground` → branco  
- `--background` / `--card` → claro no site de conteúdo  
- Variável ou classe de destaque para alertas: `orange-400` / `text-orange-400` / `bg-orange-400`  
- `--radius` generoso (`rounded-lg`, chips/CTAs `rounded-full` quando fizer sentido)  

## O que evitar

- Tema roxo-on-white / purple-to-indigo genérico de AI  
- Glow excessivo, pills demais, multi-layer shadows barulhentos  
- Hero sem marca: o nome/logo CIA VAMU deve ser sinal forte no primeiro viewport  

## Diretrizes de UI

### Site público

- Uma composição limpa por seção (um propósito, um headline).  
- Hero: marca + uma headline + uma frase + CTA + visual dominante.  
- Tipografia expressiva (não stack padrão Inter/Roboto/Arial se puder escolher fontes do projeto).  
- Mobile-first; navegação clara.  

### Admin

- Layout dashboard com sidebar (padrão shadcn).  
- Tabelas, filtros (nuqs), empty/loading/error states.  
- Formulários com labels e feedback via sonner.  

### Acessibilidade

- Contraste alto (preto/branco).  
- Labels em forms.  
- Focus states visíveis.  
- `orange-400` para destaque, não como único meio de informação.  
