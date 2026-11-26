import Link from "next/link";
import { LEGAL, LegalPage } from "@/components/legal";

export const metadata = { title: "Terms and Conditions · Flowvault" };

export default function Terms() {
  const { company, rc, address, email } = LEGAL;
  return (
    <LegalPage title="Terms">
      <p>These terms are an agreement between you and {company} ({rc}), {address} (&quot;Flowvault&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account or using Flowvault you agree to them. If you don&apos;t agree, please don&apos;t use Flowvault.</p>

      <h3>1. What Flowvault does</h3>
      <p>Flowvault lets you keep money in a Naira wallet and pay your subscriptions (for example streaming, music or TV services) with virtual cards. Each subscription you add gets its own virtual card. You can switch a subscription off at any time, which freezes its card so it can&apos;t be charged.</p>
      <p>Flowvault is not a bank and does not take deposits. Virtual cards are issued by our card partner, Maplerad, and its partner banks and card networks (Visa or Mastercard). Payments into Flowvault are processed by Paystack.</p>

      <h3>2. Who can use Flowvault</h3>
      <p>You must be at least 18, live in Nigeria, have a valid BVN and NIN, and give true and complete information. One person may hold one account. You are responsible for keeping your password safe and for everything done with your account.</p>

      <h3>3. Checking your identity</h3>
      <p>The law requires us and our partners to confirm who you are before you can use Flowvault. You must complete the ID check (BVN, NIN, a photo of your ID and a selfie) before you can use the app. We may refuse, limit or close an account if we can&apos;t confirm your identity or suspect fraud, money laundering or other misuse.</p>

      <h3>4. Your wallet</h3>
      <ul>
        <li>You add money by bank transfer or debit card through Paystack. Money is added once Paystack confirms the payment.</li>
        <li><b>Money in your wallet can only be used to pay subscriptions and Flowvault fees. It cannot be withdrawn to a bank account or sent to another person.</b> Please only add what you plan to spend on subscriptions.</li>
        <li>Your wallet is held in Naira. Your cards are in US dollars, so card payments are converted at the rate shown in the app at the time.</li>
        <li>Your wallet does not earn interest.</li>
        <li>If money is added by mistake or through fraud, we may reverse it.</li>
      </ul>

      <h3>5. Cards and subscriptions</h3>
      <ul>
        <li>Cards are virtual US-dollar Visa or Mastercard cards for paying subscriptions online. Use them only with the company you created them for.</li>
        <li>Switching a subscription off freezes its card. Charges the company attempts after that will be declined. It does not cancel your account with that company; you may still owe them under their own terms.</li>
        <li>Some companies may decline virtual or foreign cards. We can&apos;t promise every company will accept them.</li>
        <li>Keep your card details private. Tell us straight away at {email} if you think someone else has them.</li>
        <li>We or our card partner may freeze or close a card to prevent fraud or when the law requires it.</li>
      </ul>

      <h3>6. Fees</h3>
      <ul>
        <li>Making a card costs <b>$6.45</b>, taken from your wallet (in Naira at the rate shown) when you add a subscription. If your balance is too low, we tell you and no card is made.</li>
        <li>If the card can&apos;t be made, the fee is returned to your wallet.</li>
        <li>Your bank, the card network or the company you pay may charge their own fees (for example currency conversion). These are outside our control.</li>
        <li>We show every Flowvault fee in the app before you pay it. We will tell you in the app before changing any fee.</li>
      </ul>

      <h3>7. Things you must not do</h3>
      <p>Don&apos;t use Flowvault for anything illegal, for gambling, to move money for others, to test stolen cards, or to get around our checks. Don&apos;t try to break, copy or overload the app.</p>

      <h3>8. Closing your account</h3>
      <p>You can ask us to close your account at {email}. We will freeze your cards. Because wallet money can&apos;t be withdrawn, please use up your balance first; any refund of a remaining balance is at our discretion and subject to the law. We may close or suspend your account if you break these terms, and will tell you why unless the law prevents us.</p>

      <h3>9. Problems and complaints</h3>
      <p>If something goes wrong with a payment, card or fee, contact us at {email} within 30 days. We aim to reply within 5 working days. If you&apos;re not happy with our answer you may take it to the relevant Nigerian authority, such as the Federal Competition and Consumer Protection Commission.</p>

      <h3>10. Our responsibility</h3>
      <p>We work to keep Flowvault available and correct, but it is provided &quot;as is&quot;. We are not responsible for losses caused by companies you subscribe to, our partners&apos; outages, your own mistakes or sharing your details, or events outside our control. Nothing in these terms limits rights you have under Nigerian consumer law. Where we are responsible, our liability is limited to the amount of fees you paid us in the 12 months before the problem.</p>

      <h3>11. Changes</h3>
      <p>We may update these terms. We&apos;ll tell you in the app or by email before important changes take effect. Using Flowvault after that means you accept the new terms.</p>

      <h3>12. Law</h3>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria, and disputes go to Nigerian courts.</p>

      <h3>13. Contact</h3>
      <p>{company}, {address}. Email: {email}.</p>
      <p>See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </LegalPage>
  );
}
