# Balança

App de iPhone para balanças de bioimpedância **OKOK** (Chipsea), feito para substituir o app oficial. Funciona offline, não tem conta e não envia nada para a nuvem.

> As métricas de composição corporal são estimativas e não substituem avaliação profissional.

## O que faz

| | |
| --- | --- |
| **Pesagem** | Suba na balança com o app aberto. A leitura estável é salva no perfil de peso mais próximo e, se houver dúvida, o app pergunta. |
| **Peso de tendência** | Suavização de Holt (nível + ritmo). Ignora a oscilação diária de água e acompanha uma perda constante sem atraso. |
| **Composição corporal** | IMC, gordura, massa gorda, músculo, gordura visceral, água, massa óssea, proteína, metabolismo basal e idade corporal. |
| **Gordura pela fita métrica** | Método da Marinha dos EUA (pescoço, cintura e quadril) e relação cintura/altura, para quando a balança não envia impedância. |
| **Histórico** | Gráfico de cada métrica com a linha de tendência, períodos de 1M a Tudo, comparação entre duas pesagens e variação em 7 e 30 dias. |
| **Metas** | Várias ao mesmo tempo (ex.: 80 kg até dezembro e 75 kg até junho), com o progresso, o ritmo necessário, o ritmo atual dos últimos 28 dias e a data prevista. |
| **Lembrete diário** | Notificação local no horário escolhido. Não aparece se você já se pesou no dia. |
| **Seus dados** | Ficam em SQLite no aparelho. Exportação em CSV e backup/restauração em JSON. |

## Instalar no iPhone (sem Mac e sem conta paga)

1. Em [*Actions › iOS (.ipa sem assinatura)*](https://github.com/carloshendvpm/balanca/actions/workflows/ios.yml), clique em **Run workflow**. O build leva de 10 a 20 minutos.
2. Baixe o artefato `Balanca-ipa` da execução e descompacte para obter o `Balanca.ipa`.
3. No Windows, instale o [Sideloadly](https://sideloadly.io). Ele precisa do iTunes e do iCloud baixados do site da Apple, não da Microsoft Store.
4. Conecte o iPhone por cabo, arraste o `.ipa` para o Sideloadly e entre com seu Apple ID gratuito.
5. No iPhone, ative *Ajustes › Privacidade e Segurança › Modo Desenvolvedor* e confie no seu Apple ID em *Ajustes › Geral › VPN e Gerenciamento de Dispositivos*.

Com Apple ID gratuito, o app expira em **7 dias**. Para renovar, reinstale pelo Sideloadly (os dados são mantidos) ou use o [SideStore](https://sidestore.io), que renova no próprio iPhone.

## Problemas com a balança

Se a balança não for encontrada, abra *Ajustes › Diagnóstico Bluetooth* e suba nela. Ela deve aparecer no topo da lista, com o sinal mais forte, mostrando o *manufacturer data* em hex. Se a linha não ficar verde ("OKOK …"), o formato ainda não é reconhecido: anote o hex, porque é dele que o parser precisa.

Também é possível capturar os anúncios pelo computador:

```bash
uv run tools/scan_okok.py 30   # escuta por 30 s; suba na balança enquanto roda
```

## Como funciona

A balança não aceita conexão: ela só transmite o peso e a impedância em anúncios BLE. O app escuta esses anúncios com um módulo nativo em Swift (CoreBluetooth) e reconhece os formatos **V20**, **V11**, **VF0** e **C0**. Quando o peso estabiliza, calcula a composição corporal com o perfil (sexo, altura e idade) e salva a leitura.

O protocolo e as fórmulas vêm da engenharia reversa em [100nandoo/okok-bia-formulas](https://github.com/100nandoo/okok-bia-formulas). Os testes comparam os resultados com os do `okok_ble_reader.py` original e com uma captura real de uma balança C0.

## Desenvolvimento

Expo SDK 57 com Expo Router. Dá para desenvolver todo no Windows/WSL; o iOS só é compilado no CI.

```bash
npm install
npm run web         # app no navegador, com uma balança simulada
npm test            # vitest
npm run typecheck
npm run lint
```

Cada push na `main` roda os testes e o typecheck. O build do `.ipa` só roda quando disparado manualmente.

| Pasta | Conteúdo |
| --- | --- |
| `src/app/` | Telas (Expo Router): Início, Pesar, Histórico, Metas e Ajustes |
| `src/core/` | Lógica pura e testada: parsers BLE, fórmulas BIA, tendência, metas, método da Marinha, matching de perfis, detecção de pesagem estável e CSV |
| `src/ble/` | Liga o scanner aos parsers; sem Bluetooth (ex.: no navegador), usa um simulador que gera anúncios C0 reais |
| `src/db/` | Schema SQLite, migrações, consultas e estado |
| `src/data/` | Backup, importação/exportação de arquivos e lembretes |
| `src/ui/`, `src/components/` | Componentes visuais (régua da balança, gráficos, cards de meta etc.) |
| `modules/okok-scanner/` | Módulo nativo em Swift que escuta os anúncios BLE |
| `plugins/` | Config plugin que remove o entitlement de push, que um Apple ID gratuito não consegue assinar (os lembretes são locais) |
| `tools/` | `scan_okok.py`, captura de anúncios BLE pelo computador |
| `.github/workflows/ios.yml` | Testes em cada push e build manual do `.ipa` sem assinatura |
