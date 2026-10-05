// Exact samples matching standard UIDAI EOD Status Report specifications provided in prompt
export const SAMPLE_HTML_REPORT = `<!DOCTYPE HTML>
<html>
<head>
	<title>Enrolment Client Status Reports </title>
	<style>
	body { margin: 0; padding: 0; font-family: Arial; font-size: 12px; }
	.wrapper { background-color: #FFFFFF; margin: 0 auto; width: 100%; }
	.container { padding: 5px; width: 98%; margin: 0 auto; }
	.container h2 { text-align: center; padding: 20px 0px; font-size: 22px; }
	.container table { border: 2px solid #000; width: 100%; border-collapse: collapse; }
	.container table td, .container table th { border: 2px solid #000; padding: 5px; }
  </style>
</head>
<body>
<div class="wrapper">
	<div class="container">
		<h2> UIDAI Enrolment Client - Status Report </h2>
		<div class="first_view">
			<table>
				<tr><td> <label> Date </label></td><td> <span> 01/01/1970 05:30:00</span></td></tr>
				<tr><td> <label> Registrar </label></td><td> <span> 991</span> </td></tr>
				<tr><td> <label> Enrolment Agency  </label></td><td><span> 0991</span> </td></tr>
				<tr><td> <label> Operator </label></td><td> <span> WCDKXJ766835</span></td></tr>
				<tr><td> <label> Station ID </label></td><td> <span> 88026</span></td></tr>
			</table>
		</div>
		<div class="second_view">
			<table>
				<tr><td> <label> Last Registered </label> </td><td> <span> - - -</span> </td></tr>
				<tr><td> <label> Last Synch </label></td><td> <span> - - -</span> </td></tr>
				<tr><td> <label> Version no. of Client </label></td><td><span> 3.3.4.2</span> </td></tr>
			</table>
		</div>
		<div class="pick_date">
			<h3> Report Generated for Date: 21/09/2026 to 30/09/2026</h3>
		</div>
		<div class="details_view">
			<table>
				<thead>
				<th> S.No </th>
				<th> Enrolment No. and Date </th>
				<th> Appointment Id </th>
				<th> Type </th>
				<th> Mandatory biometric update </th>
				<th> IS_NRI </th>
				<th> Tin Number </th>
				<th> Operator ID </th>
				<th> Reviewer ID</th>
				<th> Introducer </th>
				<th> Proof </th>
				<th> Resident </th>
				<th> Status </th>
				<th> Introducer Review Status </th>
				<th> User Review Status </th>
				<th> GST Applied(%) </th>
				<th> Amount charged for New Enrolment </th>
				<th> Amount charged for Update Enrolment </th>
				<th> Total amount charged </th>
				</thead>
				<tbody>
				<tr>
					<td> 1</td>
					<td> S146465900573020260921111221</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 105.93</td>
					<td> 125.0</td>
				</tr>
				<tr>
					<td> 2</td>
					<td> S148675295684020260921140933</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 105.93</td>
					<td> 125.0</td>
				</tr>
				<tr>
					<td> 3</td>
					<td> S144424602564020260921175619</td>
					<td> </td>
					<td> U</td>
					<td> Yes</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 105.93</td>
					<td> 125.0</td>
				</tr>
				<tr>
					<td> 4</td>
					<td> S131167660828020260921105749</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 63.56</td>
					<td> 75.0</td>
				</tr>
				<tr>
					<td> 5</td>
					<td> S148096504564020260921154729</td>
					<td> </td>
					<td> U</td>
					<td> Yes</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
				</tr>
				<tr>
					<td> 6</td>
					<td> S143426201199020260921175129</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 105.93</td>
					<td> 125.0</td>
				</tr>
				<tr>
					<td> 7</td>
					<td> S145486160236020260921110429</td>
					<td> </td>
					<td> U</td>
					<td> Yes</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
				</tr>
				<tr>
					<td> 8</td>
					<td> S134503658481020260921120413</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 63.56</td>
					<td> 75.0</td>
				</tr>
				<tr>
					<td> 9</td>
					<td> S148963601066020260921123415</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 105.93</td>
					<td> 125.0</td>
				</tr>
				<tr>
					<td> 10</td>
					<td> S131534764889020260921105059</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 63.56</td>
					<td> 75.0</td>
				</tr>
				<tr>
					<td> 11</td>
					<td> S143563546119020260921112649</td>
					<td> </td>
					<td> U</td>
					<td> Yes</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
				</tr>
				<tr>
					<td> 12</td>
					<td> S116159413241020260921130213</td>
					<td> </td>
					<td> N</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
				</tr>
				<tr>
					<td> 13</td>
					<td> S134597002155020260921152301</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 63.56</td>
					<td> 75.0</td>
				</tr>
				<tr>
					<td> 14</td>
					<td> S112346538906020260921152911</td>
					<td> </td>
					<td> N</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
				</tr>
				<tr>
					<td> 15</td>
					<td> S146680045017020260921120857</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> Completed</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 105.93</td>
					<td> 125.0</td>
				</tr>
				<tr>
					<td> 16</td>
					<td> S117123042699020260926124051</td>
					<td> </td>
					<td> N</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> REJECTED</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
					<td> 0.0</td>
				</tr>
				<tr>
					<td> 17</td>
					<td> S131610591007020260926134721</td>
					<td> </td>
					<td> U</td>
					<td> No</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> InProcess</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 63.56</td>
					<td> 75.0</td>
				</tr>
				<tr>
					<td> 18</td>
					<td> S147336645460020260930160119</td>
					<td> </td>
					<td> U</td>
					<td> Yes</td>
					<td> No</td>
					<td></td> <td> WCDKXJ766835</td> <td> </td> <td> </td> <td> $details.proof</td>
					<td> $details.residentName</td>
					<td> InProcess</td> <td> </td> <td> $details.userRevStat</td>
					<td> 18.0</td>
					<td> 0.0</td>
					<td> 105.93</td>
					<td> 125.0</td>
				</tr>
				</tbody>
			</table>
			<div class="view_exp"> <label> <b>Type</b>: E=Enrolment - U=Update , <b>Proof</b>: I=Introducer - D=Document - HF= Head of Family,</label> </div>
		</div>
	</div>
</div>
</body>
</html>`;

export const SAMPLE_CSV_REPORT = `SLNO,ENROLMENT_NO_DATE,APPOINTMENT_ID,TYPE,MANDATORY_BIO_METRIC_UPDATE_ONLY,IS_NRI,TIN_NO,OPERATOR_ID,INTRODUCER,PROOF,RESIDENT_NAME,STATUS,GST_AMOUNT,AMOUNT_CHARGED_FOR_NEW_ENROLMENT,AMOUNT_CHARGED_FOR_UPDATE_ENROLMENT,TOTAL_AMOUNT_CHARGED,PROCESSING_STATE_DESCRIPTION,REJECT_REASON_DESCRIPTION,PACKET_SKIPPED,FOREIGN_RESIDENT
1,S116583412285020260921102029,,N,No,No,,WCDKMJ904893,,,,REJECTED,18.0,0.0,0.0,0.0,,"type=, errorReasonCode=PKT_REJECT_FOR_POOR_QUALITY_QR",No,No
2,S146943772158020260921103709,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,105.93,125.0,,,No,No
3,S135447944213020260921122021,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
4,S141899498856020260921122523,,U,Yes,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
5,S113140072051020260921150753,,N,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
6,S131310161700020260921180326,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
7,S132013379192020260921104351,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
8,S111665977224020260921114007,,N,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
9,S137704379748020260921114939,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
10,S119135302391020260921120339,,N,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
11,S113788947161020260921124415,,N,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
12,S132526649550020260921155053,,U,Yes,No,,WCDKMJ904893,,,,Completed,18.0,0.0,105.93,125.0,,,No,No
13,S139157363129020260922102339,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
14,S134628779346020260922103429,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
15,S131919411522020260922133405,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
16,S146190255855020260922144155,,U,Yes,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
17,S138356876591020260922172607,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
18,S113073850670020260922173737,,N,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
19,S148035679869020260922105500,,U,Yes,No,,WCDKMJ904893,,,,Completed,18.0,0.0,105.93,125.0,,,No,No
20,S136205044469020260922113623,,U,Yes,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
21,S146842177178020260922121935,,U,Yes,No,,WCDKMJ904893,,,,REJECTED,18.0,0.0,0.0,0.0,,"type=null, errorReasonCode=RESIDENT_MAN_DEDUPE_REJECT_DEMO_ANOMALOUS_SAME_PARENT",No,No
22,S137658386702020260922122521,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
23,S112877420393020260922133735,,N,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
24,S134779176686020260922143707,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
25,S134766228580020260922150249,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
26,S147717778720020260923133917,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,105.93,125.0,,,No,No
27,S135858946440020260923172925,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
28,S131138528285020260923111155,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
29,S137958030507020260923112815,,U,Yes,No,,WCDKMJ904893,,,,Completed,18.0,0.0,105.93,125.0,,,No,No
30,S131167873444020260923115553,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
31,S133976287868020260923120159,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
32,S132993865890020260923133221,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
33,S137064313319020260924141903,,U,No,No,,WCDKMJ904893,,,,REJECTED,18.0,0.0,63.56,75.0,,"type=BUSINESS_EXCEPTION, errorReasonCode=RESIDENT_QC_POA_DOCUMENT_NAME_MISMATCH",No,No
34,S135233613777020260924154011,,U,No,No,,WCDKMJ904893,,,,REJECTED,18.0,0.0,63.56,75.0,,"type=BUSINESS_EXCEPTION, errorReasonCode=RESIDENT_QC_POI_DOCUMENT_NOT_APPROVED",No,No
35,S118945968381020260924104755,,N,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
36,S137784596136020260924110619,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
37,S112611679945020260924151021,,N,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,0.0,0.0,,,No,No
38,S136186139817020260924165926,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,63.56,75.0,,,No,No
39,S146495127476020260924182406,,U,No,No,,WCDKMJ904893,,,,Completed,18.0,0.0,105.93,125.0,,,No,No
40,S111405902029020260924105649,,N,No,No,,WCDKMJ904893,,,,InProcess,18.0,0.0,0.0,0.0,,,No,No
`;
