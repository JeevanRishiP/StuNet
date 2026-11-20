import { prisma } from "../packages/db/src";

/**
 * Script to assign third semester students to their respective academic sections (Sec 1, Sec 2, Sec 3)
 * based on the official classroom and exam allotment lists.
 *
 * Allotment Breakdown:
 * - Sec 1 (Section 001): 60 students (Room 2 & Room 29)
 * - Sec 2 (Section 002): 61 students (Room 1)
 * - Sec 3 (Section 003): 60 students (Room 3)
 * Total: 181 students
 */

const sec1 = [
  "AMARDEEP",
  "ABHAY",
  "ABHINAV",
  "ABHISHEK A MUDDEBIHAL",
  "ABHISHEK",
  "ADITHYA",
  "ADITHYA KULAL",
  "ANKITHA V M",
  "B S PRAJWAL",
  "BAASIM AHAMED",
  "SANJANA BADAGALA",
  "C NISHANTH",
  "CHANDAN",
  "CH. LAKSHMI NARASIMHA REDDY",
  "CIVIN V V",
  "DAANISH S C",
  "DAKSHITHA SHREE",
  "DAYYALA VENKATA POOJITHA",
  "DEEKSHA S",
  "GADUGINA VIVEK",
  "HAVINASH. G",
  "HARSHA",
  "HARSHAVARDHAN M S",
  "HARSHINI.L",
  "JAHNAVI PATEL C",
  "KAMAL A H",
  "KARAN RAJ K R",
  "LAHARI HS",
  "MADDISEN A",
  "MAHESH M",
  "MANJUNATH",
  "MOHAMMED AHMED ALI",
  "HAMMAD",
  "NANDEESH",
  "NIHARIKA B L",
  "NIKHIL GOWDA H C",
  "PRABHURAJ MALLIKARJUN PATED",
  "PAVAN PAVAN",
  "PEDDININENI PRIYADARSHINI",
  "PRAJEET CHANSHETTY",
  "RAMESH HUGAR",
  "RAVIKIRAN S",
  "SACHIN",
  "SAGAR",
  "SAHIL SAIFY",
  "SAI SHARATH",
  "SAINATH",
  "SANJANA SHANTAYYANAMATH",
  "SANJANA GUDAGUDI",
  "SANJAY HS",
  "SANJITH SASTRY",
  "SANKEERTH TS",
  "SRISHTI",
  "SUJAN NAIK",
  "VIJAY SAI",
  "SURYA M",
  "VIKAS",
  "VIKAS JAGADEV",
  "YADUNANDAN",
];

const sec2 = [
  "AAKIB ALI",
  "ANDRA NANDA KISHORE",
  "DEEPAK KONAKALLA",
  "KETHAN KRISHNA KONIDALA",
  "NITHIN KUMAR U",
  "SANKIRTH R BHAT",
  "SHIVANI.C",
  "VITTHAL SIDDAPPA GAVADE",
  "AFNAN BANETTI RAMZAN",
  "BALA SUBRAMANYA G HIREMATH",
  "DHANUSH NAIK",
  "KURUBA MADAN MOHAN",
  "NITISH KUMAR",
  "SHAIK ASIF",
  "SHRENIK SK",
  "YATHIN RAJ M",
  "AISIRI VENUGOPAL",
  "BASANAGOUDA",
  "DHANUSH S",
  "M.YUVARAJ",
  "P BHARATH",
  "SHAIK MOHAMMAD SHAHID",
  "SUHAS",
  "NALAMARU DEEPIKA",
  "AKASH B RAJU",
  "BESTHA LAKSHMI SAI VINEEL VYAS",
  "GAGAN C V",
  "MADDAKA HANSY",
  "PRAJWAL ANNASAB PATIL",
  "SHAIK MOHAMMED SHAKEER S",
  "SUNNAPUSETTY JAGADESH",
  "GANDIKOTA NAGA MOHITH",
  "AKASH M R",
  "BHAGYA",
  "GAMPA AKSHAY",
  "NEVAN KARITHEY",
  "PRAJWAL GS",
  "SHANMUKHA BADRINATH PISIPATI",
  "SURAM MUKTHESWAR REDDY",
  "AKSHAY GOWDA H M",
  "CHANDANA D",
  "HARSHITHA SHREE RAJ",
  "SHREYAS MUDTAM",
  "PRAJWAL R",
  "SHASHANK D",
  "VISHAL.B",
  "AKSHAY S NAIK",
  "CHANNABASAVA PATIL",
  "JAHNAVI. R",
  "N DARSHIT",
  "RAKSHITH A",
  "SHASHANK SINGH",
  "VISHWAS BAJAJ",
  "NANDITHA",
  "CHENNU SUJITH INDRA REDDY",
  "KARUMURI LOWKIK VENKATA SHANMUKHA SAI",
  "NIKHILKUMAR S",
  "REPURI PAUL SPURGEON",
  "SHASHWATH U",
  "RISHAAN NAIR",
  "SHESHADRI S",
];

const sec3 = [
  "AMOGH",
  "BOYALLA NANDA VAMSI KRISHNA REDDY",
  "GAGAN RENUKA",
  "KUCHI LIKHITH",
  "VISHWAJITH PANDUGA",
  "SAAGNIK DEY",
  "SMARAN PRAKASH JANI",
  "THEJAS N M",
  "ANKITH G PRASAD",
  "CHETHANA M G",
  "GOWTHAM SRINIVAS",
  "KUMATHI JAGAN MOHAN REDDY",
  "PARINITHA GL",
  "CHARAN TEJA",
  "SNEHA ILLUR",
  "VIKAS KRISHNA T L",
  "ARADHANA S",
  "CHIRANJEEVI S",
  "H R HANUSH",
  "LAKSHMI",
  "PRANATHI M K",
  "AYAAN NAZIMUDDIN SHAIKH",
  "SOHAN D R",
  "VINAY S KUMAR",
  "ATHISH N",
  "DAKSHESH M",
  "JEEVAN RISHI",
  "MAHENDAR M",
  "PRANAV K U",
  "SHAMITH GOWDA",
  "SAROSH KRUPANAND",
  "VINAY S GIDAKANNAVAR",
  "AVALAPPA JAYASRI",
  "DHARANESH PM",
  "K P PRATYUSHAA",
  "MANISH BNR",
  "PRANAV P ANGADI",
  "SHOBITHA KN",
  "SRINIDHI KOTAGIRI",
  "AVILIGONDA BHARAT AKHIL SAI",
  "DHRUV REDDY J",
  "K R PRASHANTH",
  "MANISH P SHETTY",
  "PREETHAM",
  "SHREYA S",
  "SRUSHTI B H",
  "BINDUSHRI D",
  "DIVYA NAGAPPA HAVANUR",
  "SANTHOSH REDDY",
  "NALLA CHERAN DEEPAK",
  "PULLA CHARAN SAI",
  "SHREYAS L",
  "SURYA N",
  "DHANESH",
  "NITYA EAGA",
  "KANNA VAMSHI KRISHNA",
  "NUTHAN M",
  "ROHINI R PATEL",
  "SHWETHA",
  "DHANUNJAY T",
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const ALIASES: Record<string, string> = {
  [norm("ABHISHEK")]: "2102508516",
  [norm("JEEVAN RISHI")]: "2102508579",
  [norm("KUMATHI JAGAN MOHAN REDDY")]: "2102508589",
  [norm("NEVAN KARITHEY")]: "2102508595",
  [norm("ANKITH G PRASAD")]: "2102508528",
  [norm("SHAIK ASIF")]: "2102508648",
  [norm("SHAMITH GOWDA")]: "2102508652",
  [norm("PAVAN PAVAN")]: "2102508618",
  [norm("PRAJWAL ANNASAB PATIL")]: "2102508621",
  [norm("GANDIKOTA NAGA MOHITH")]: "2102508692",
};

export async function updateSections() {
  const dbStudents = await prisma.studentAcademicDetails.findMany({
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          studentEmail: true,
          section: true,
        },
      },
    },
    orderBy: { usn: "asc" },
  });

  const mapping: Array<{
    usn: string;
    userId: string;
    email: string;
    sec: string;
    dbName: string;
  }> = [];
  const assignedUsns = new Set<string>();

  function processList(list: string[], secCode: string) {
    for (const name of list) {
      const n = norm(name);
      if (n === norm("CHANDAN")) {
        continue;
      }
      if (ALIASES[n]) {
        const usn = ALIASES[n];
        const student = dbStudents.find((s) => s.usn === usn);
        if (student) {
          mapping.push({
            usn,
            userId: student.userId,
            email: student.user.studentEmail!,
            sec: secCode,
            dbName: student.user.displayName,
          });
          assignedUsns.add(usn);
        }
        continue;
      }
      const student = dbStudents.find(
        (s) => norm(s.user.displayName) === n && !assignedUsns.has(s.usn),
      );
      if (student) {
        mapping.push({
          usn: student.usn,
          userId: student.userId,
          email: student.user.studentEmail!,
          sec: secCode,
          dbName: student.user.displayName,
        });
        assignedUsns.add(student.usn);
      }
    }
  }

  processList(sec1, "Sec 1");
  // Both Chandan BM and Chandan M are assigned to Sec 1
  const c1 = dbStudents.find((s) => s.usn === "2102508545")!;
  mapping.push({
    usn: c1.usn,
    userId: c1.userId,
    email: c1.user.studentEmail!,
    sec: "Sec 1",
    dbName: c1.user.displayName,
  });
  assignedUsns.add(c1.usn);

  const c2 = dbStudents.find((s) => s.usn === "2102508546")!;
  mapping.push({
    usn: c2.usn,
    userId: c2.userId,
    email: c2.user.studentEmail!,
    sec: "Sec 1",
    dbName: c2.user.displayName,
  });
  assignedUsns.add(c2.usn);

  processList(sec2, "Sec 2");
  processList(sec3, "Sec 3");

  if (mapping.length !== 181) {
    throw new Error(`Expected 181 mappings, got ${mapping.length}`);
  }

  console.log(`Updating ${mapping.length} students across UserIdentity and InstitutionalRoster...`);

  await prisma.$transaction(async (tx) => {
    for (const item of mapping) {
      await tx.userIdentity.update({
        where: { id: item.userId },
        data: { section: item.sec },
      });

      await tx.institutionalRoster.updateMany({
        where: {
          OR: [{ email: item.email }, { identifier: item.usn }],
        },
        data: { section: item.sec },
      });
    }

    const batch = await tx.campusBatch.findFirst({
      where: {
        year: 2025,
        currentSemester: 3,
      },
    });
    if (batch) {
      await tx.campusBatch.update({
        where: { id: batch.id },
        data: {
          sections: ["Sec 1", "Sec 2", "Sec 3"],
          numberOfSections: 3,
        },
      });
    }
  });

  console.log("Successfully updated all 181 student sections.");
}

if (require.main === module) {
  updateSections()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
