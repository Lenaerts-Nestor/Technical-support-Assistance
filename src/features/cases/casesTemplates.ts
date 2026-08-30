import type { TemplateBodies } from './types'

/**
 * EN / NL / ES copy for each Utilities button, keyed by button id (see
 * TEMPLATE_GROUPS in casesData.ts) then language. Carried over verbatim from the
 * previous version of the tool — merge fields ({!Contact.FirstName},
 * {!Case.CaseNumber}, {!Case.Subject}) and ###### / ##### placeholders are left
 * exactly as written, and blank-line spacing inside each message is preserved.
 *
 * A button with no entry for the active language falls back to a "[Label]"
 * placeholder in useCases.
 */
export const TEMPLATE_BODIES: TemplateBodies = {
  // ---- Opening ----
  'opening.mail': {
    en: `Hi {!Contact.FirstName},

Thank you for contacting Crestron's True Blue Support Team!
Case {!Case.CaseNumber} has been created for this issue.

Should you have any other query, please do not hesitate to contact us. Thank you.`,
    nl: `Beste {!Contact.FirstName},

Bedankt om contact op te nemen met Crestron's True Blue Support Team!
Case {!Case.CaseNumber} werd aangemaakt voor dit probleem.

Twijfel zeker niet om ons te contacteren indien u verdere vragen heeft. Alvast bedankt.`,
    es: `Estimado/a {!Contact.FirstName},
Gracias por ponerse en contacto con el equipo de soporte True Blue de Crestron.
El caso {!Case.CaseNumber} ha sido creado para este problema.

No dude en contactarnos si tiene más preguntas. Muchas gracias.`,
  },
  'opening.mailCall': {
    en: `Hi {!Contact.FirstName},

Thank you for contacting Crestron's True Blue Support Team!
Case {!Case.CaseNumber} has been created for this issue.

As discussed during our call,

Should you have any other query, please do not hesitate to contact us. Thank you.`,
    nl: `Beste {!Contact.FirstName},

Bedankt om contact op te nemen met Crestron's True Blue Support Team!
Case {!Case.CaseNumber} werd aangemaakt voor dit probleem.

Zoals besproken aan de telefoon/Zoals telefonisch besproken,

Twijfel zeker niet om ons te contacteren indien u verdere vragen heeft. Alvast bedankt.`,
    es: `Estimado/a {!Contact.FirstName},
Gracias por ponerse en contacto con el equipo de soporte True Blue de Crestron.
El caso {!Case.CaseNumber} ha sido creado para este problema.

Tal como se habló por teléfono,

No dude en contactarnos si tiene más preguntas. Muchas gracias.`,
  },
  'opening.issueSummary': {
    en: `Hi {!Contact.FirstName},

Thank you for contacting Crestron's True Blue Support Team!
Case {!Case.CaseNumber} has been created for this issue.

To help us investigate your case as efficiently as possible, could you please provide us with the following:

1. A detailed description of the issue you are experiencing.
2. The exact error message or behavior observed.
3. The troubleshooting steps you have already attempted and the result of each.

Any additional context, such as recent system changes, firmware updates, or network modifications, would also be very helpful.

Should you have any other query, please do not hesitate to contact us. Thank you.`,
    nl: `Beste {!Contact.FirstName},

Bedankt om contact op te nemen met Crestron's True Blue Support Team!
Case {!Case.CaseNumber} werd aangemaakt voor dit probleem.

Om uw case zo efficiënt mogelijk te kunnen onderzoeken, zou u ons het volgende kunnen bezorgen:

1. Een gedetailleerde beschrijving van het probleem dat u ondervindt.
2. De exacte foutmelding of het waargenomen gedrag.
3. De probleemoplossende stappen die u al heeft ondernomen en het resultaat van elk.

Elke aanvullende context, zoals recente systeemwijzigingen, firmware-updates of netwerkaanpassingen, is ook erg welkom.

Twijfel zeker niet om ons te contacteren indien u verdere vragen heeft. Alvast bedankt.`,
    es: `Estimado/a {!Contact.FirstName},

Gracias por ponerse en contacto con el equipo de soporte True Blue de Crestron.
El caso {!Case.CaseNumber} ha sido creado para este problema.

Para ayudarnos a investigar su caso de la manera más eficiente posible, ¿podría facilitarnos lo siguiente?

1. Una descripción detallada del problema que experimenta.
2. El mensaje de error exacto o el comportamiento observado.
3. Los pasos de resolución de problemas que ya ha intentado y el resultado de cada uno.

Cualquier contexto adicional, como cambios recientes en el sistema, actualizaciones de firmware o modificaciones de red, también sería de gran ayuda.

No dude en contactarnos si tiene más preguntas. Muchas gracias.`,
  },
  'opening.associateAccount': {
    en: `\t
We noticed that currently your email address ##### is not associated with a valid account number on our website.To gain access to support and RMA resources identification is required.
\t
Please register the email address and connect your customer number, this will only have to be done once.

Instructions to set up the account and have your customer number approved by your company admin can be found here:
https://community.crestron.com/s/article/id-1000579`,
    nl: `
We hebben gemerkt dat uw e-mailadres ##### momenteel niet gekoppeld is aan een geldig accountnummer op onze website.Om toegang te krijgen tot support- en RMA-resources is identificatie vereist.

Gelieve het e-mailadres te registreren en uw klantnummer te koppelen; dit hoeft slechts één keer te gebeuren.
Instructies om een account aan te maken en uw klantnummer door uw bedrijfsbeheerder te laten goedkeuren, vindt u hier:
https://community.crestron.com/s/article/id-1000579
`,
    es: `
Hemos notado que actualmente su dirección de correo electrónico ##### no está asociada con un número de cuenta válido en nuestro sitio web.Para obtener acceso a soporte y recursos de RMA, se requiere identificación.

Por favor, registre la dirección de correo electrónico y conecte su número de cliente; esto solo tendrá que hacerse una vez.
Las instrucciones para configurar la cuenta y hacer que su número de cliente sea aprobado por el administrador de su empresa se pueden encontrar aquí:
https://community.crestron.com/s/article/id-1000579
`,
  },

  // ---- Diagnostics ----
  'diagnostics.askInfo': {
    en: `Thank you for the provided information, we would like to ask a few more questions to help us investigate this better.`,
    nl: `Bedankt voor de verstrekte informatie. We willen graag nog een paar aanvullende vragen stellen om het probleem beter te kunnen onderzoeken.`,
    es: `Gracias por la información proporcionada. Nos gustaría hacerle algunas preguntas adicionales para ayudarnos a investigar el problema mejor.`,
  },
  'diagnostics.confirmSummary': {
    en: `If any part of this summary is incorrect, or if there are additional units involved that were not mentioned or i missed, please let me know. We want to ensure we have all the necessary information so we can provide you with the best possible support.`,
    nl: `Als een deel van deze samenvatting onjuist is, of als er bijkomende toestellen betrokken zijn die niet vermeld werden of die ik gemist heb, laat het me dan weten. We willen er zeker van zijn dat we alle nodige informatie hebben, zodat we u de best mogelijke ondersteuning kunnen bieden.`,
    es: `Si alguna parte de este resumen es incorrecta, o si hay unidades adicionales involucradas que no se mencionaron o que se me pasaron, hágamelo saber. Queremos asegurarnos de tener toda la información necesaria para poder ofrecerle el mejor soporte posible.`,
  },
  'diagnostics.remoteSession': {
    en: `To help us better diagnose the issue, we would like to schedule a remote troubleshooting session with you. Could you let us know your availability so we can arrange a suitable time?

Note: for the remote session we will use TeamViewer.`,
    nl: `Om het probleem beter te kunnen diagnosticeren, willen we graag een remote troubleshooting sessie met u inplannen. Kunt u ons uw beschikbaarheid laten weten, zodat we een geschikt tijdstip kunnen afspreken?

Opmerking: voor de remote sessie maken we gebruik van TeamViewer.`,
    es: `Para ayudarnos a diagnosticar mejor el problema, nos gustaría programar una sesión de diagnóstico remoto con usted. ¿Podría indicarnos su disponibilidad para que podamos encontrar un momento adecuado?

Nota: para la sesión remota utilizaremos TeamViewer.`,
  },
  'diagnostics.uploaderLink': {
    en: `Please upload the file(s) using the method below. Make sure to provide the download link to the uploaded file(s) through the ticket.

Link: https://uploader.crestron.com/index.php
Username: uploader
Password: C2874&374nu!`,
    nl: `Gelieve het/de bestand(en) te uploaden via de onderstaande methode. Zorg ervoor dat u de downloadlink van het/de geüploade bestand(en) via het ticket doorgeeft.

Link: https://uploader.crestron.com/index.php
Gebruikersnaam: uploader
Wachtwoord: C2874&374nu!`,
    es: `Por favor, suba el/los archivo(s) utilizando el método indicado a continuación. Asegúrese de proporcionar el enlace de descarga del/los archivo(s) a través del ticket.

Enlace: https://uploader.crestron.com/index.php
Usuario: uploader
Contraseña: C2874&374nu!`,
  },
  'diagnostics.infoGathering': {
    en: `Crestron Information Gathering Tool

https://community.crestron.com/s/article/ATSG

Instructions:

1. Run the tool.
2. Enter the IP address of the unit.
3. Leave credentials at default*
4. Select the appropriate device type from the Command List.
5. Tick PLOGS checkbox to ensure persistent logs are gathered if supported by the device.
6. Hit Start (accept the Windows Firewall message if one appears).
7. From the top menu click Uploader.
8. Check the tickbox to agree to the Terms of Service.
9. Click Send to Uploader.
10. Copy & Paste the uploader link and send to Crestron Technical Support.

*These are the same connection details required to connect using Crestron Toolbox and often the same credentials are used for the device's web interface where applicable. Default username is crestron, password is blank, connection type SSH. If this has been changed, enter username and password as appropriate.`,
    nl: `Crestron Information Gathering Tool

https://community.crestron.com/s/article/ATSG

Instructies:

1. Start de tool.
2. Vul het IP-adres van het apparaat in.
3. Laat de inloggegevens op standaard staan*
4. Selecteer het juiste apparaattype uit de Command List.
5. Vink het vakje PLOGS aan om persistente logs te verzamelen indien ondersteund door het apparaat.
6. Klik op Start (accepteer het Windows Firewall-bericht als dat verschijnt).
7. Klik in het bovenste menu op Uploader.
8. Vink het vakje aan om akkoord te gaan met de Gebruiksvoorwaarden.
9. Klik op Send to Uploader.
10. Kopieer en plak de uploaderlink en stuur deze naar Crestron Technical Support.

*Dit zijn dezelfde verbindingsgegevens als voor Crestron Toolbox. Standaard gebruikersnaam: crestron, wachtwoord: leeg, verbindingstype: SSH. Als dit gewijzigd werd, vul dan de aangepaste gegevens in.`,
    es: `Crestron Information Gathering Tool

https://community.crestron.com/s/article/ATSG

Instrucciones:

1. Ejecute la herramienta.
2. Introduzca la dirección IP de la unidad.
3. Deje las credenciales por defecto*
4. Seleccione el tipo de dispositivo adecuado de la lista de comandos.
5. Marque la casilla PLOGS para recopilar registros persistentes si el dispositivo lo admite.
6. Haga clic en Inicio (acepte el mensaje del Firewall de Windows si aparece).
7. En el menú superior, haga clic en Uploader.
8. Marque la casilla para aceptar los Términos del Servicio.
9. Haga clic en Send to Uploader.
10. Copie y pegue el enlace del uploader y envíelo al soporte técnico de Crestron.

*Estos son los mismos datos de conexión de Crestron Toolbox. Usuario predeterminado: crestron, contraseña: en blanco, tipo de conexión: SSH. Si se ha modificado, introduzca las credenciales correspondientes.`,
  },

  'diagnostics.thirdPartyModules': {
    en: `All available modules on the Crestron side can be found on the following links:
https://applicationmarket.crestron.com/
&
https://drivers.crestron.io/

If Crestron does not have a module for certain 3rd party products, there are 3 options for an immediate solution:
1. Create own modules in SIMPL/S+/S#/C#
2. Create a Crestron Certified Driver: https://community.crestron.com/s/article/id-1000185
3. Request a CSP to create a module: https://www.crestron.com/How-To-Buy/find-a-dealer-or-partner/Find-a-Service-Provider

A 4th option is to feature request a Crestron Certified Driver if it's not urgent and you would like us to just look into it (not guaranteed that Crestron will create a driver). For this we need the following:
• Specific device model being controlled
• Method of control (IP / Serial / IR)
• Driver Number if any existing drivers were attempted (ex. https://drivers.crestron.io/rad/driver-search/2030 )`,
    nl: `Alle beschikbare modules aan de Crestron-zijde zijn te vinden via de volgende links:
https://applicationmarket.crestron.com/
&
https://drivers.crestron.io/

Als Crestron geen module heeft voor bepaalde producten van derden, zijn er 3 opties voor een onmiddellijke oplossing:
1. Eigen modules maken in SIMPL/S+/S#/C#
2. Een Crestron Certified Driver maken: https://community.crestron.com/s/article/id-1000185
3. Een CSP vragen om een module te maken: https://www.crestron.com/How-To-Buy/find-a-dealer-or-partner/Find-a-Service-Provider

Een 4de optie is om via een feature request een Crestron Certified Driver aan te vragen als het niet dringend is en u wilt dat wij het gewoon bekijken (geen garantie dat Crestron een driver zal maken). Hiervoor hebben we het volgende nodig:
• Specifiek toestelmodel dat wordt aangestuurd
• Aansturingsmethode (IP / Serieel / IR)
• Drivernummer indien er bestaande drivers werden geprobeerd (bv. https://drivers.crestron.io/rad/driver-search/2030 )`,
    es: `Todos los módulos disponibles por parte de Crestron se pueden encontrar en los siguientes enlaces:
https://applicationmarket.crestron.com/
&
https://drivers.crestron.io/

Si Crestron no dispone de un módulo para determinados productos de terceros, existen 3 opciones para una solución inmediata:
1. Crear módulos propios en SIMPL/S+/S#/C#
2. Crear un Crestron Certified Driver: https://community.crestron.com/s/article/id-1000185
3. Solicitar a un CSP que cree un módulo: https://www.crestron.com/How-To-Buy/find-a-dealer-or-partner/Find-a-Service-Provider

Una 4ª opción es solicitar un Crestron Certified Driver mediante una feature request si no es urgente y desea que simplemente lo revisemos (no se garantiza que Crestron cree un driver). Para ello necesitamos lo siguiente:
• Modelo específico del dispositivo que se controla
• Método de control (IP / Serie / IR)
• Número de driver si se han probado drivers existentes (ej. https://drivers.crestron.io/rad/driver-search/2030 )`,
  },

  // ---- RMA ----
  'rma.option1Asking': {
    en: `In case we proceed with an RMA, would you be able to provide us with the following RMA information:
Serial Number:
Product name:
Issue description:
Project name/reference:
Delivery/return address confirmation
  Company name:
  Delivery contact:
  Address:
  City:
  Postal Code:
  Country: `,
    nl: `Indien we overgaan tot een RMA, zou u ons de volgende RMA-informatie kunnen bezorgen:
Serienummer:
Productnaam:
Omschrijving van het probleem:
Projectnaam/referentie:
Bevestiging leverings-/retouradres
  Bedrijfsnaam:
  Contactpersoon levering:
  Adres:
  Stad:
  Postcode:
  Land: `,
    es: `En caso de que procedamos con un RMA, ¿podría facilitarnos la siguiente información del RMA?
Número de serie:
Nombre del producto:
Descripción del problema:
Nombre/referencia del proyecto:
Confirmación de la dirección de entrega/devolución
  Nombre de la empresa:
  Persona de contacto para la entrega:
  Dirección:
  Ciudad:
  Código postal:
  País: `,
  },
  'rma.approving': {
    en: `Hi {!Contact.FirstName},

We will proceed with getting an RMA created for this device.

Once the RMA has been created this case will be updated with the RMA information as well as an RMA confirmation document sent directly to your email.`,
    nl: `Beste {!Contact.FirstName},

We zullen een RMA aanmaken voor dit apparaat.

Zodra de RMA is aangemaakt, wordt deze case bijgewerkt met de RMA-informatie en ontvangt u een RMA-bevestigingsdocument rechtstreeks op uw e-mailadres.`,
    es: `Hola {!Contact.FirstName},

Procederemos a crear una RMA para este dispositivo.

Una vez que la RMA haya sido creada, este caso se actualizará con la información de la RMA y se enviará un documento de confirmación de la RMA directamente a su correo electrónico.`,
  },
  'rma.direct': {
    en: `Hi {!Contact.FirstName},

We will proceed with getting an RMA created for this device.

Once the RMA has been created this case will be updated with the RMA information as well as an RMA confirmation document sent directly to your email`,
    nl: `Beste {!Contact.FirstName},

We zullen doorgaan met het aanmaken van een RMA voor dit apparaat.

Zodra de RMA is aangemaakt, wordt deze case bijgewerkt met de RMA-informatie en ontvangt u een RMA-bevestigingsdocument rechtstreeks in uw e-mail.`,
    es: `Hola {!Contact.FirstName},

procederemos a crear un RMA para este dispositivo.

Una vez que se haya creado el RMA, esta caso se actualizará con la información del RMA y se le enviará un documento de confirmación del RMA directamente a su correo electrónico.`,
  },
  'rma.outOfWarrantyPreCost': {
    en: ` We don't work with a preset cost for repairs, we can however note the below estimation.

Initial assessment costs for standard repairs start at 160 GBP + part cost.  After review of the unit, we'll be able to provide you with an estimate for you to approve.
Service estimates below or equal to 250 GBP will be auto-approved to improve our Turnaround Time (TAT) for repairs. If required, please provide a PO in response to the RMA confirmation for the max. amount of 250 GBP prior to returning the product to our service center so we can add your PO information to our service invoice.

Please let us know on how you would like to proceed or should you have any further queries. Thank you.

`,
    nl: ` Wij werken niet met een vaste kostprijs voor herstellingen, we kunnen echter onderstaande raming meegeven.

De kosten voor de initiële beoordeling van standaardherstellingen beginnen vanaf 160 GBP + onderdeelkosten.  Na controle van het toestel kunnen we u een raming ter goedkeuring bezorgen.
Service-ramingen lager dan of gelijk aan 250 GBP worden automatisch goedgekeurd om onze doorlooptijd (TAT) voor herstellingen te verbeteren. Indien nodig, gelieve een PO te bezorgen in antwoord op de RMA-bevestiging voor het max. bedrag van 250 GBP vooraleer u het product terugstuurt naar ons service center, zodat we uw PO-informatie kunnen toevoegen aan onze servicefactuur.

Laat ons weten hoe u wenst verder te gaan of indien u nog verdere vragen heeft. Alvast bedankt.

`,
    es: ` No trabajamos con un coste predefinido para las reparaciones, no obstante podemos indicar la siguiente estimación.

Los costes de la evaluación inicial para reparaciones estándar comienzan en 160 GBP + coste de las piezas.  Tras revisar la unidad, podremos facilitarle una estimación para su aprobación.
Las estimaciones de servicio iguales o inferiores a 250 GBP se aprobarán automáticamente para mejorar nuestro tiempo de respuesta (TAT) en las reparaciones. Si es necesario, indíquenos un PO en respuesta a la confirmación del RMA por el importe máximo de 250 GBP antes de devolver el producto a nuestro centro de servicio, para que podamos añadir la información de su PO a nuestra factura de servicio.

Indíquenos cómo desea proceder o si tiene alguna otra consulta. Muchas gracias.

`,
  },
  'rma.npf': {
    en: `Hello {!Contact.FirstName},

The unit with reference RMA ###### / SN ###### has been tested at our technician's lab but unfortunately we have not been able to duplicate the reported issue.
In order to identify the issue and repair accordingly, please answer the below questions:

If you have additional information pertaining to this RMA, feel free to reply directly to this email to have this information included.
Alternatively, please send us your approval to return the unit in its original state. Should you have any other query, please do not hesitate to contact us.

Thank you.`,
    nl: `Hallo {!Contact.FirstName},

Het toestel met referentie RMA ###### / SN ###### is getest in ons technisch labo, maar helaas hebben we het gemelde probleem niet kunnen reproduceren.
Om het probleem te identificeren en dienovereenkomstig te repareren, gelieve de onderstaande vragen te beantwoorden:

Als u aanvullende informatie heeft met betrekking tot deze RMA, kunt u rechtstreeks op deze e-mail antwoorden om deze informatie toe te voegen.
U kunt ook uw goedkeuring geven om het toestel in zijn originele staat terug te sturen. Twijfel zeker niet om ons te contacteren indien u verdere vragen heeft.

Alvast bedankt.`,
    es: `Hola {!Contact.FirstName},

La unidad con referencia RMA ###### / SN ###### ha sido probada en nuestro laboratorio técnico, pero lamentablemente no hemos podido reproducir el problema reportado.
Para poder identificar el problema y repararlo en consecuencia, por favor responda las siguientes preguntas:

Si tiene información adicional relacionada con esta RMA, no dude en responder directamente a este correo electrónico para incluirla.
Alternativamente, envíenos su aprobación para devolver la unidad en su estado original. Si tiene alguna otra consulta, no dude en contactarnos.

Gracias.`,
  },
  'rma.avoidNpf': {
    en: `We want to avoid an NPF (No Problem Found) and thus reduce costs on your side. For this reason, we ask so many questions.`,
    nl: `We willen een NPF (No Problem Found) vermijden en zo de kosten aan uw kant verminderen. Daarom stellen we zoveel vragen.`,
    es: `Queremos evitar un NPF (No Problem Found) y así disminuir gastos por su parte. Por esta razón hacemos tantas preguntas.`,
  },

  // ---- Follow Up ----
  'followUp.first': {
    en: `Hi {!Contact.FirstName},

I just wanted to follow up and check if everything is still
working correctly. Do you need help with anything else?

If you have any questions or need further assistance, please
feel free to reach out. I'll be happy to help.`,
    nl: `Beste {!Contact.FirstName},

Ik wilde even opvolgen en controleren of alles nog steeds correct
werkt. Heeft u nog hulp nodig met iets? Als u vragen heeft of
verdere ondersteuning nodig heeft, neem dan gerust contact op.
Ik help u graag.`,
    es: `Buenas {!Contact.FirstName},

Solo quería hacer un seguimiento y confirmar si todo sigue
funcionando correctamente. ¿Necesita ayuda con algo más?

Si tiene alguna pregunta o necesita más asistencia, no dude en
contactarnos. Con gusto le ayudaré.`,
  },
  'followUp.second': {
    en: `Hi {!Contact.FirstName},

This is our second attempt to follow up on your case regarding
the {!Case.Subject}.

Could you kindly confirm if you still require any further
assistance?
We'd appreciate an update on the status of this case.`,
    nl: `Beste {!Contact.FirstName},

Dit is ons tweede follow-up bericht over uw case met betrekking
tot {!Case.Subject}.
Kunt u bevestigen of u nog verdere ondersteuning nodig heeft?
We zouden een update over de status van deze case op prijs stellen.`,
    es: `Buenas {!Contact.FirstName},

¿Podría confirmar amablemente si aún necesita asistencia adicional?
Agradeceríamos una actualización sobre el estado de este caso.`,
  },
  'followUp.thirdClose': {
    en: `Hi {!Contact.FirstName},

As we have not received a response to our previous follow-ups,
we will be proceeding to close case {!Case.CaseNumber} in
2 business days.

If you still require assistance, please reply to this email and
we will be happy to continue supporting you.

Thank you for contacting Crestron True Blue Support.`,
    nl: `Beste {!Contact.FirstName},

Aangezien we geen reactie hebben ontvangen, zullen we case
{!Case.CaseNumber} binnen 2 werkdagen sluiten.

Als u nog hulp nodig heeft, aarzel dan niet om op deze e-mail
te reageren.

Bedankt voor het contacteren van Crestron True Blue Support.`,
    es: `Hola {!Contact.FirstName},

Como no hemos recibido respuesta, procederemos a cerrar el caso
{!Case.CaseNumber} en 2 días hábiles.

Si aún necesita asistencia, no dude en responder a este correo.

Gracias por contactar con Crestron True Blue Support.`,
  },
  'followUp.closeUpdate': {
    en: `Hi {!Contact.FirstName},

Thanks for the update. I will go ahead and mark the case as solved. If you require further assistance please do not hesitate to contact us again. Hope you have a great rest of your day!`,
    nl: `Beste {!Contact.FirstName},

Bedankt voor de update. Ik zal de case als opgelost markeren. Mocht u verdere hulp nodig hebben, aarzel dan niet om ons opnieuw te contacteren. Ik wens u een fijne rest van de dag!`,
    es: `Hola {!Contact.FirstName},

Gracias por la actualización. Procederé a marcar el caso como resuelto. Si necesita más asistencia, no dude en contactarnos de nuevo. ¡Que tenga un excelente resto del día!`,
  },
  'followUp.closeAnswered': {
    en: `Hi {!Contact.FirstName},

As your questions have been answered, I will go ahead and close the case. If you require further assistance please do not hesitate to contact us again. Hope you have a great day!`,
    nl: `Beste {!Contact.FirstName},

Aangezien uw vragen beantwoord zijn, zal ik de case sluiten. Mocht u verdere hulp nodig hebben, aarzel dan niet om ons opnieuw te contacteren. Fijne dag!`,
    es: `Hola {!Contact.FirstName},

Como sus preguntas han sido respondidas, procederé a cerrar el caso. Si necesita más asistencia, no dude en contactarnos de nuevo. ¡Que tenga un buen día!`,
  },
  'followUp.closeOoo': {
    en: `Thank you for the update!

As you are out of office, we will close this case for the time being so that you will not receive any automated follow-up. When you are back in the office, you can reply to this email to have this case reopened.

Should you have any other query, please do not hesitate to contact us. Thank you.`,
    nl: `Bedankt voor de update!

Aangezien u afwezig bent, sluiten we deze case voorlopig zodat u geen automatische opvolging ontvangt. Wanneer u terug op kantoor bent, kunt u op deze e-mail antwoorden om de case opnieuw te laten openen.

Twijfel zeker niet om ons te contacteren indien u verdere vragen heeft. Alvast bedankt.`,
    es: `¡Gracias por la actualización!

Como está fuera de la oficina, cerraremos este caso por el momento para que no reciba ningún seguimiento automático. Cuando vuelva a la oficina, puede responder a este correo electrónico para que el caso se reabra.

No dude en contactarnos si tiene alguna otra consulta. Muchas gracias.`,
  },
  'followUp.clientWorking': {
    en: `Hi {!Contact.FirstName},

Understood. We will wait for your responses. Thank you for keeping us informed.
If you have any further questions, please do not hesitate to contact us.`,
    es: `Buenas,
Entendido. Quedamos atentos a sus respuestas. Gracias por informarnos.
Si tiene alguna otra pregunta, no dude en contactarnos.`,
  },
}
