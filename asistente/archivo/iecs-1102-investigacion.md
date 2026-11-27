# Investigación IECS consulta pública N° 1102 (iodixanol) — v3
Fecha: 2026-11-27. Plazo de Vistazo: 06/12/2026. Reemplaza v1 y v2.
Método: documentos abiertos con curl/WebFetch/APIs públicas (Europe PMC, Crossref, ClinicalTrials.gov, WordPress API de CAEME). Los resultados de WebSearch se marcan "indicio" y no cuentan como verificados.
Regla de lectura: relación institucional legítima != conflicto de interés potencial != intervención efectiva en la evaluación específica.

## 0. Bloqueos que persisten
- pubmed.ncbi.nlm.nih.gov: desafío anti-bot. No se evadió. Se usó Europe PMC / Crossref.
- www.jacc.org y www.sciencedirect.com: HTTP 403 (bloqueo de clientes automatizados). Reed 2009: solo el abstract (Europe PMC); la declaración de intereses de Moscucci NO se pudo ver. Tampoco Heinrich 2009 (Radiology) en texto completo.
- docs.bvsalud.org y www.valueinhealthjournal.com: 403. Se leyó la versión del informe 939 en ets.iecs.org.ar y Value in Health 2024 vía LSE/Europe PMC/Crossref.
- eprints.lse.ac.uk: rechazado por el proxy (no habilitado). www.cari.org.au: no resolvió/rechazado (KHA-CARI no verificado).
- PMC de la guía japonesa (PMC6949208): la página abre pero sin el texto; el recomendación sobre iso vs bajo osmolar no se leyó.
- Para cerrar: habilitar eprints.lse.ac.uk y cari.org.au, o que alguien copie las secciones "Disclosures" de Reed 2009 y Heinrich 2009.

## 1. Resumen ejecutivo (verificado con documento abierto)
1. La 1102 está en la lista oficial, pero NO publica solicitante, financiador, PICO, protocolo ni autores. El número "1102" no figura en el sitio (el formulario es el id 2473). Solo se puede obtener pidiéndolo al IECS.
2. Regla oficial: ETS "a pedido y bajo el financiamiento" de miembros del Consorcio; "cualquier institución del Consorcio puede solicitar". La industria no tiene "injerencia directa".
3. CAEME es miembro del Consorcio (puede solicitar por regla). Bayer es miembro de CAEME (logo en su sitio) y Philip Glaser (Bayer) integra hoy la comisión directiva de CAEME como Director (vocal). Esto es una relación institucional y un conflicto potencial, no prueba de intervención en la 1102. No hay evidencia pública de que CAEME o Bayer pidieran la 1102.
4. Londero tesorero 2022: no verificable (hoy el tesorero es de GSK y Londero no figura).
5. DIRECT 2012 (EuroIntervention): CONFIRMADO financiamiento de Bayer (grant no. 14147, "unrestricted research grant") y revisión del manuscrito por P. Lengsfeld (Bayer); Y. Chen recibió gastos de orador de Bayer. Resultado neutro (no inferioridad de iopromida; CIN 0,4% vs 0,3%). No favorece a Bayer en superioridad ni a GE.
6. Evidencia externa independiente (meta-análisis, ACR/NKF) apunta a que no hay diferencia clínicamente relevante entre contrastes iso y de baja osmolaridad en CI-AKI (a confirmar texto completo de Reed/Heinrich). Hay señales de que iohexol (Omnipaque, producto de GE) podría tener más riesgo que iodixanol en intraarterial con insuficiencia renal. Esto afecta la cartera propia de GE y Vistazo.
7. Value in Health 2024: autores IECS confirmados; financiación "unrestricted educational grant" del Precision Cancer Consortium con "sponsor had no role"; es oncología (NGS), sin relación temática con contrastes. Participación de Bayer en el PCC: no verificable.
8. Informe 939 (finerenona): Bayer S.A. fue invitada a la consulta (rutina). No hay anexo III en la versión PDF abierta.

## 2. Hallazgos con fuente
| # | Afirmación | URL abierta | Fecha | Fragmento textual | Interpretación / limitaciones | Estado |
|---|---|---|---|---|---|---|
| 1 | La 1102 y qué publica | https://ets.iecs.org.ar/consulta-publica ; https://ets.iecs.org.ar/formulario-consulta-publica/inicial/2473 | abierto 27/11/2026 | "Contraste iodixanol en pacientes con alto riesgo de toxicidad renal – Aportar información hasta el 06/12/2026" | Sin solicitante/PICO/autores. El formulario pide declarar COI (vínculo económico con productor, financiador o prestador). | confirmado; solicitante no verificable |
| 2 | Quién puede solicitar | https://www.iecs.org.ar/metodosets2/ | © 2026 | "Cualquier institución del Consorcio puede solicitar al IECS la elaboración de un informe de ETESA." "frente a un conflicto de cobertura, una institución nos solicita una ayuda técnica" | Etapas: aporte inicial 9 días; embargo 5 días hábiles; consulta pública 90 días. Revisan 2 investigadores + equipo de 20 expertos. | confirmado |
| 3 | Financiamiento e independencia | formulario 2473 (idem) | idem | "Estos documentos son realizados a pedido y bajo el financiamiento de instituciones públicas, de la seguridad social y privadas ... del Consorcio... Ni la industria productora... tiene injerencia directa sobre la elaboración de los informes" | Política declarada, no auditada. | confirmado (política) |
| 4 | Consorcio ETS y CAEME | https://iecs.org.ar/en/evaluacion-de-tecnologias-sanitarias-y-economia-de-la-salud/consorcio/ | © 2026 | "network made up of 30 health financing institutions... possibility of consulting and requesting IECS to prepare integrative health technology assessment reports" ; lista: "CADIME", "OSDE", "Swiss Medical Group", "Hospital Británico", "Hospital Albert Einstein", "CAEME – Argentine Chamber of Medicinal Specialties" | CAEME es la única cámara industrial de la lista. CADIME también es miembro. | confirmado |
| 5 | Convenio CAEME-IECS | https://iecs.org.ar/firmamos-un-convenio-con-caeme/ | 05/06/2017 | "El IECS firmó un convenio y un proyecto con la Cámara Argentina de Especialidades Medicinales (CAEMe) que favorecen que, en el proceso de ETS, participen pacientes... la industria farmacéutica..." Firmantes A. Pichón-Riviere y A. Paganelli | Objeto: participación en el proceso. Texto íntegro y vigencia no vistos. | confirmado (existencia/objeto) |
| 6 | Comisión directiva de CAEME y Bayer | https://www.caeme.org.ar/institucional/ (modificada 24/11/2026 según API WP) | 2026 | "Comisión directiva Presidente Domingues Caetano, Gastón (Biohope); Vicepresidente 1° Ruiz Villamil, Agustina (Pfizer); ... Tesorero Gutiérrez, Maximiliano (GSK Biopharma) ... Directores ... Glaser, Philip (Bayer) ..." | Bayer tiene un Director; no preside ni es tesorero. La comisión incluye a 13+ compañías. GE HealthCare no aparece entre los logos de socios (~40). | confirmado (Glaser, Bayer socio); Londero: no verificable |
| 7 | Cargo y trayectoria de Glaser en Bayer Pharma Cono Sur | no abierto | — | — | No se verificó cargo ni fecha (nov 2024) con fuente primaria de Bayer. | no verificable |
| 8 | Informe 939 finerenona | https://ets.iecs.org.ar/storage/4703/VF---Finereonona-en-IRC.pdf | sept. 2023 | Autores: Mengarelli, Bardach, Alfie, Perelli, Mejia, Ciapponi, García Martí, Augustovski, Alcaraz, Pichón-Riviere. "Los autores han indicado que no tienen conflicto de interés". "organizaciones relacionadas a la tecnología: Bayer S.A., Sociedad Argentina de Nefrología, CADRA..." | Bayer invitada como productor. Sin anexo III en esta versión (solo Anexos I y II). Observaciones de Bayer: no vistas. | invitación confirmada; anexo III no confirmado |
| 9 | Financiadores del IECS | https://iecs.org.ar/financiacion-3/ | © 2026 | Logos (alt): Pfizer, Sanofi, AstraZeneca, NIH, OMS, IDRC, Hospital Británico | Lista parcial ("algunas de las instituciones"). Bayer y GE no figuran. | confirmado (parcial) |
| 10 | DIRECT: financiamiento Bayer | https://eurointervention.pcronline.com/article/renal-tolerability-of-iopromide-and-iodixanol-in-562-renally-impaired-patients-undergoing-cardiac-catheterisation-the-direct-study/pdf ; registro https://clinicaltrials.gov/api/v2/studies/NCT00926562 | EuroIntervention 2012;8:830-838 (oct. 2012); registro 19/06/2009 | "This work was supported by an unrestricted research grant (no. 14147) from Bayer Healthcare, Germany" ; "We thank Dr. Philipp Lengsfeld (Bayer Healthcare, Germany) for a thorough review of [the manuscript]" ; "Y. Chen has received speaker's expenses from Bayer Healthcare. All of the other authors have no conflicts of interest" | El registro lista como sponsor al Chinese PLA General Hospital (el org ID es 14147): el registro no menciona a Bayer, el artículo sí. | confirmado |
| 11 | DIRECT: diseño y conclusiones | idem | idem | 19 centros en China; 592 reclutados, 562 evaluables; aleatorizado, doble ciego; desenlace primario: CIN día 3 (aumento relativo de creatinina ≥50%); "Non-inferiority of low-osmolar iopromide to iso-osmolar iodixanol was demonstrated, with p<0.001"; CIN iopromida 0,4% vs iodixanol 0,3% | Limitaciones: eGFR moderada (30-60), hidratación rigurosa, tasas muy bajas, creatinina como desenlace sustituto (admitido por los autores), volumen de contraste distinto (129,1 vs 115,5 ml, p=0,031). Solo población china. | confirmado |
| 12 | Reed 2009 resultados | Europe PMC (EXT_ID 19628188) vía https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:19628188%20AND%20SRC:MED | 2009 | "16 trials including 2,763 subjects... summary RR: 0.79, 95% CI: 0.56 to 1.12... iohexol (RR: 0.19, 95% CI: 0.07 to 0.56; p = 0.002)... iopromide (RR: 0.93, 95% CI: 0.47 to 1.85)... iodixanol (Visipaque, GE Healthcare...)" Conclusión: "not associated with less CI-AKI... may vary based on the specific type of LOCM" | Resultado global neutro; ventaja vs iohexol (producto de GE). | confirmado (abstract) |
| 13 | Reed 2009: declaración de Moscucci | JACC/ScienceDirect 403 | — | — | No visto. | no verificable |
| 14 | Heinrich 2009 (Radiology) | Europe PMC EXT_ID 19092091 | 2009 | "25 trials... RR 0,80 (0,61-1,04)... intraarterial + insuficiencia renal: iohexol mayor riesgo que iodixanol (RR 0,38; 0,21-0,68), sin diferencia con otros LOCM no iohexol (RR 0,95; 0,50-1,78)" | COI no visto. Fuente de datos incluyó solicitud a todos los fabricantes. | confirmado (abstract); COI no verificable |
| 15 | ACR/NKF 2020 | https://pmc.ncbi.nlm.nih.gov/articles/PMC7525144/ (texto vía Europe PMC) | 2020 | "There are no confirmed clinically relevant differences in risk of CA-AKI between LOCM and IOCM for intravenous applications. Indirect evidence suggests that the LOCM iohexol may have a higher risk compared with other LOCM, but that potential risk difference has not been confirmed." | COI de autores: Weinreb "consulting fee or honorarium from Bayer Healthcare and Bracco Diagnostics"; McDonald "scientific advisor for GE Healthcare; institution received research funding from GE Healthcare"; Dillman: Bracco. Hay vínculos con ambas partes. | confirmado |
| 16 | AHRQ | https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:26866209%20AND%20SRC:MED (NBK343725) | 2016 (búsqueda a julio 2015) | "Contrast-Induced Nephropathy: Comparative Effectiveness of Preventive Measures": 163 ECA | Es sobre medidas preventivas (hidratación, NAC, bicarbonato, estatinas), no una evaluación de cobertura de un agente. La fecha es 2016 y no 2015. | confirmado (como tipo de documento) |
| 17 | Meta-análisis independiente iodixanol vs iopromida | https://pmc.ncbi.nlm.nih.gov/articles/PMC6393082/ | Medicine 2018 | "8 trials with 3532 patients... no significant difference in the incidence of CIN (OR 0.50, 0.19-1.35)... iodixanol was associated with a statistically significant reduction in cardiovascular adverse events (OR 0.47, 0.30-0.73)". Funding: grants de China (NSFC); "The authors declare that they have no conflicts of interest"; "Only 1 trial was funded by industry" | Señal cardiovascular posible; basada en ECA heterogéneos. | confirmado |
| 18 | Meta-análisis retractado | https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:36714420 (Retraction Note, Hindawi/J Healthc Eng) | 2023 | "Retracted: Iopromide and Iodixanol in the Development of Postoperative Contrast Nephropathy..." (retracts 10.1155/2022/1469370, que concluía que iodixanol era más seguro) | Evitar citar el artículo de 2022 retractado. Motivo de retractación no leído. | confirmado |
| 19 | Value in Health 2024 | https://www.lse.ac.uk/lse-health/research/projects/value-framework-ngscgp-technologies ; Crossref 10.1016/j.jval.2024.02.002; Europe PMC PMID 38403113 | 2024 | Autores: Augustovski, Colaci, Mills, Chavez, Argento, Alfie, Pichon Riviere, Kanavos, Alcaraz. "Funding was received through an unrestricted educational grant from the Precision Cancer Consortium. The sponsor had no role in the design, conduct or reporting of the research." Comité: "Benjamin Horbach (Global Leader, Market Access, Roche, representing PCC)" | Se confirma financiamiento institucional por un consorcio; la lista de miembros del PCC (¿Bayer?) no se encontró. Texto con COI personales no abierto. Tema: NGS oncología. | financiamiento y autores: confirmado; Bayer en PCC: no verificable |
| 20 | NICE NG148 | https://www.nice.org.uk/guidance/ng148/chapter/Recommendations | actualización 2024 | "Do not delay the use of iodine-based contrast media in an emergency..."; "small but increased risk of acute kidney injury associated with an eGFR less than 30" | La página de recomendaciones no contiene el término "osmolar": no recomienda un agente específico. | confirmado |
| 21 | KDIGO / KHA-CARI / guías japonesas | indicio WebSearch (KDIGO: usar iso o bajo osmolar, 1B, sin preferencia). KHA-CARI y Japón no leídos | — | — | KDIGO solo como indicio. | no verificable |
| 22 | Estudios patrocinados por GE | indicio WebSearch: estudio de Beijing Anzhen (208 pacientes) "parcialmente financiado por GE" con menos CIN para iodixanol (nota de prensa, no abierta). ACR/NKF: un autor asesor de GE | — | — | Los ensayos originales (NEPHRIC, etc.) no se revisaron con COI. | parcialmente verificado |
| 23 | Antecedentes de ETS de cobertura solo sobre iodixanol | búsquedas sin hallazgos (IECS, ETS internacionales) | — | — | Ausencia en las búsquedas no prueba inexistencia. | no verificable |

## 3. Matriz de relaciones
| Relación | Evidencia | Tipo | Estado |
|---|---|---|---|
| CAEME -> Consorcio ETS IECS (puede solicitar) | página oficial | institucional | confirmado |
| CAEME-IECS convenio 2017 | nota IECS | institucional (participación en consultas) | confirmado |
| Bayer -> CAEME socio; Glaser director | sitio CAEME | membresía y gobierno | confirmado |
| Londero tesorero CAEME 2022 | sin fuente | | no verificable |
| Bayer -> IECS (fondos) | logos: no figura | | no verificable |
| Pfizer, Sanofi, AstraZeneca -> IECS (convenios/subsidios) | logos | institucional | confirmado (parcial) |
| PCC -> IECS (Value Health 2024) | LSE/Crossref | financiamiento institucional, "sin rol" | confirmado; miembros PCC no verificados |
| Bayer -> DIRECT | artículo | grant, revisión del manuscrito, gastos de orador | confirmado |
| Bayer -> informe 939 | PDF | invitada como interesada | confirmado |
| Bayer/GE/Bracco -> autores ACR/NKF | declaraciones del artículo | vínculos personales a ambos lados | confirmado |
| GE -> CAEME | no figura entre logos | | no verificado en profundidad |
| GE/Vistazo -> 1102 | productor de iodixanol, invitado a aportar | COI comercial propio | a declarar |

## 4. Hipótesis sobre el origen de la 1102
Ninguna se puede confirmar ni descartar: el solicitante no es público.
1. Institución médica del Consorcio (hospitales: Británico, Einstein, Austral): plausible.
2. Financiador (obra social/prepaga: OSDE, Swiss Medical, OMINT, etc.): plausible; el proceso nace de un "conflicto de cobertura".
3. Evaluar si el diferencial de precio se justifica: plausible. Ojo: la pregunta puede ser iodixanol vs iohexol (Omnipaque, también de GE) o vs otro agente de baja osmolaridad, no necesariamente vs iopromida. Los comparadores de la PICO son clave.
4. Sociedad científica: requeriría un miembro del Consorcio como solicitante; sin evidencia.
5. Bayer vía CAEME u otro: posible por mecanismo (CAEME miembro; Bayer miembro de CAEME con director en su comisión), pero sin evidencia de que lo hiciera. Faltan: solicitante, fecha, financiador y toda intervención efectiva. CAEME agrupa ~40 compañías; una solicitud de CAEME a nombre de la cámara no equivale a una de Bayer, y no sería lógico pedir una evaluación que (según DIRECT, Reed y ACR/NKF) probablemente concluya equivalencia con iopromida.
Alternativas: iniciativa del IECS por demanda de varios financiadores; proyecto de revisión sobre contrastes.
Sesgo a evitar: tratar la pertenencia a CAEME como prueba. Tampoco descartar a Bayer por la evidencia neutral.

## 5. Revisión crítica de la estrategia
- Bien: no acusar, pedir transparencia, presentar a tiempo, trazabilidad, escalamiento gradual.
- Pedir al IECS: tipo de solicitante, PICO y comparadores preliminares, estrategia de búsqueda, equipo, política de COI, cronograma de embargo. Es probable que no revele el nombre del solicitante.
- Declarar los COI de GE/Vistazo en el formulario (campo "conflicto de interés"). La evidencia de GE se presenta con patrocinio explícito.
- Equilibrio de evidencia: la evidencia neutral comparada con iopromida no justifica un diferencial; la ventaja potencial está vs iohexol en intraarterial con insuficiencia renal (Heinrich, Reed) y una posible señal cardiovascular (Zhang 2018). Pedir que la PICO distinga vía (IV vs IA), función renal y comparador.
- No citar el meta-análisis retractado de 2022.
- Cuidado: pedir "revisión de pares ciegos" o "revisores" es razonable, pero el IECS declara que el equipo es el único responsable.
- No sugerir a Bayer/CAEME en ningún escrito. Las acciones legales no tienen base.
- La estrategia debe contemplar que el resultado podría ser desfavorable al diferencial de precio de Visipaque frente a otros agentes. Preparar argumentos de valor honestos (subgrupos, costos totales).

## 6. Recomendaciones antes del 06/12/2026
1. Enviar el formulario (https://ets.iecs.org.ar/formulario-consulta-publica/inicial/2473) con COI declarado, tabla de evidencia (RS/ECA, guías, políticas de cobertura) y patrocinio de cada estudio.
2. Mail neutro a consultapublicaets@iecs.org.ar y consorcioetesa@iecs.org.ar con los pedidos del punto 5, formulados como solicitud estándar para todos los interesados.
3. Cerrar pendientes: declaraciones de intereses de Reed 2009 y Heinrich 2009, KHA-CARI, guía japonesa 2018, KDIGO original, miembros del PCC, cargo de Glaser y trayectoria de Londero en fuentes de Bayer (www.bayer.com.ar).
4. Revisión simétrica de estudios patrocinados por GE y por Bayer (tabla de patrocinio por estudio); incluir NEPHRIC, CARE, RECOVER y otros ensayos pivotales.
5. Involucrar Medical Affairs y Market Access de GE; analizar el portafolio propio (Omnipaque vs Visipaque).
6. Considerar un especialista independiente con honorarios declarados.
7. Preparar la respuesta técnica al preliminar (embargo 5 días hábiles, consulta 90 días).
8. Conservar trazabilidad (capturas fechadas de https://ets.iecs.org.ar/consulta-publica, correos, versiones enviadas).
