import Link from "next/link";
import { LEGAL, LegalPage } from "@/components/legal";

export const metadata = { title: "Terms and Conditions · Flowvault" };

export default function Terms() {
  const { company, rc, address, email } = LEGAL;
  const mail = <a href={`mailto:${email}`}>{email}</a>;
  return (
    <LegalPage title="Terms">
      <p>These terms are an agreement between you and {company} ({rc}), {address} (&quot;Flowvault&quot;, &quot;we&quot;, &quot;us&quot;). By ticking &quot;I agree&quot; when you sign up, or by using Flowvault, you accept them. Please read them, especially the parts in bold. If you don&apos;t agree, please don&apos;t use Flowvault.</p>

      <h3>1. What Flowvault does</h3>
      <p>Flowvault lets you keep money in a Naira wallet and pay your subscriptions (for example streaming, music or TV services) with virtual cards. Each subscription you add gets its own virtual card. You can switch a subscription off at any time, which freezes its card so it can&apos;t be charged.</p>
      <p>Flowvault is not a bank. Your wallet balance is a record of money you have paid in to spend on subscriptions; it is not a savings or deposit account. Virtual cards are issued by our card partner, Maplerad, with its partner banks and the card networks (Visa or Mastercard). Payments into Flowvault are processed by Paystack. Each partner&apos;s own terms also apply to the part of the service they provide.</p>

      <h3>2. Who can use Flowvault</h3>
      <p>You must be at least 18, live in Nigeria, have a valid BVN and NIN, and give true and complete information. One person may hold one account, in their own name, for their own use. You are responsible for keeping your password and phone safe and for activity on your account until you tell us it has been compromised.</p>

      <h3>3. Checking your identity</h3>
      <p>Nigerian law requires us and our partners to confirm who you are. You must complete the ID check (BVN, NIN, a photo of your ID and a selfie) before you can use the app. We may refuse, limit, freeze or close an account if we can&apos;t confirm your identity, or if we reasonably suspect fraud, money laundering, terrorism financing or other misuse. Where the law requires, we may report activity to the authorities (such as the Nigerian Financial Intelligence Unit) and may not be allowed to tell you.</p>

      <h3>4. Your wallet</h3>
      <ul>
        <li>You add money by bank transfer or debit card through Paystack. It shows in your wallet once Paystack confirms the payment.</li>
        <li><b>Money in your wallet can only be used to pay your subscriptions and Flowvault fees. It cannot be withdrawn to a bank account, cashed out or sent to another person.</b> Please only add what you plan to spend on subscriptions.</li>
        <li><b>We will refund your remaining balance to a bank account in your own verified name if: we close your account without fault on your part, we stop running Flowvault, or the law requires it.</b> We may hold or keep money where the law requires, for example during a fraud investigation.</li>
        <li>Your wallet is in Naira. Your cards are in US dollars, so when a card is funded we convert at the rate shown in the app at that moment.</li>
        <li>Your wallet does not earn interest.</li>
        <li>If money reaches your wallet by mistake, or through fraud or a reversed payment, we may take it back.</li>
      </ul>

      <h3>5. Cards and subscriptions</h3>
      <ul>
        <li>Cards are virtual US-dollar Visa or Mastercard cards for paying subscriptions online. Use each card only with the company you created it for.</li>
        <li>Switching a subscription off freezes its card, and charges after that will be declined. <b>It does not cancel your account with that company</b>; you may still owe them under their own terms.</li>
        <li>Some companies decline virtual or foreign cards, and the card network or issuer may decline a payment. We can&apos;t promise every company will accept them.</li>
        <li>Keep your card details private. Tell us straight away at {mail} if you think someone else has them or a payment wasn&apos;t yours. We will freeze the card and help you dispute it.</li>
        <li>We or our card partner may freeze or close a card to prevent fraud or when the law requires it.</li>
      </ul>

      <h3>6. Fees</h3>
      <ul>
        <li>Making a card costs <b>$6.45</b>, taken from your wallet (in Naira at the rate shown) when you add a subscription. If your balance is too low, we tell you and no card is made.</li>
        <li>If the card can&apos;t be made, the fee goes back to your wallet automatically.</li>
        <li>We always show a Flowvault fee in the app before you pay it. We will give you at least 30 days&apos; notice in the app or by email before raising a fee or adding a new one.</li>
        <li>Your bank, the card network or the company you pay may charge their own fees (for example currency conversion or cross-border fees). These are outside our control.</li>
      </ul>

      <h3>7. Things you must not do</h3>
      <p>Don&apos;t use Flowvault for anything illegal, for gambling or betting, to move money for other people, to test stolen cards, to pretend to be someone else, or to get around our checks or limits. Don&apos;t try to break, copy, reverse-engineer or overload the app.</p>

      <h3>8. Closing your account</h3>
      <p>You can close your account at any time by emailing {mail}. We will freeze your cards and handle any remaining balance as described in section 4. We may suspend or close your account if you break these terms or the law requires it, and will tell you why unless the law prevents us. Records we must keep by law are kept as set out in our <Link href="/privacy">Privacy Policy</Link>.</p>

      <h3>9. Complaints</h3>
      <ul>
        <li>Email {mail} with your name, the date and what went wrong. We will acknowledge it within 24 hours and aim to resolve it within 14 days. Some card disputes depend on the card network and can take longer; we will keep you updated.</li>
        <li>If you are not happy with our answer, you can escalate to the Federal Competition and Consumer Protection Commission (FCCPC), or, for payment issues, to the consumer protection department of the Central Bank of Nigeria. For data protection issues you can go to the Nigeria Data Protection Commission.</li>
      </ul>

      <h3>10. Our responsibility</h3>
      <p>We work to keep Flowvault available and accurate, but we can&apos;t promise it will always work without interruption. We are not responsible for: what the companies you subscribe to do; outages at our partners or banks; losses caused by you sharing your password or card details; or events outside our reasonable control. Where we are responsible, our liability is limited to the amount the problem directly cost you, up to the higher of the fees you paid us in the 12 months before it and ₦100,000. <b>None of this limits our responsibility for our own fraud or gross negligence, for money in your wallet, or any right you have under Nigerian consumer protection law.</b></p>

      <h3>11. Changes</h3>
      <p>We may update these terms. We will tell you in the app or by email at least 30 days before important changes take effect (sooner if the law or a partner requires it). If you don&apos;t agree, you can close your account before then and section 4 applies to your balance.</p>

      <h3>12. Law and disputes</h3>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria. We will first try to settle any dispute with you through the complaints process above. If that doesn&apos;t work, either of us may take it to a court in Nigeria.</p>

      <h3>13. Contact</h3>
      <p>{company}, {address}. Email: {mail}.</p>
      <p>See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </LegalPage>
  );
}
