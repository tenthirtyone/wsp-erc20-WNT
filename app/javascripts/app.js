import "../stylesheets/app.css";
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'
import wnt_template from '../../build/contracts/WispNetworkToken.json'
import wisp_template from '../../build/contracts/Wisp.json'

var WispNetworkToken = contract(wnt_template);
var Wisp = contract(wisp_template);
window.Wisp = Wisp;
var watcher; 

window.App = {
  accounts: [],
  account: null,
  currentWisp: null,
  wisps: [],
  filter: null,
  start: function() {
    var self = this;

    WispNetworkToken.setProvider(web3.currentProvider);
    Wisp.setProvider(web3.currentProvider);


    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      self.accounts = accs;
      self.account = self.accounts[0];
      console.log(self.accounts)
      self.refreshAccounts();
      self.refreshBalance();
      self.watchLogs();
    });
    self.getContractAddress();
  },

  refreshAccounts: function() {    
    var self = this;
    $('.accounts').empty();     
    if (self.accounts && self.accounts.length > 0) {
      self.accounts.forEach(function(account) {
        $('.accounts').append('<option>' + account + '</option>');
      })
    }
  },

  getContractAddress: function() {
    var self = this;
    var wnt;

    WispNetworkToken.deployed().then(function(instance) {
      wnt = instance;
      $('.contract-address').text(wnt.address);
    })  
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  createWisp: function() {
    var self = this;
    var wnt;

    WispNetworkToken.deployed().then(function(instance) {
      wnt = instance;
      var _weight = $('.wisp-weight').val();
      return wnt.createWisp(_weight, false, {from: self.account, gas:10000000});
    }).then(function(receipt, _address) {
      console.log(receipt);
      console.log(_address);
    });
  },

  watchLogs: function() {
    var self = this;
    console.log('logging...')
    WispNetworkToken.deployed().then(function(instance) {
      watcher = instance.allEvents();
      console.log('watcher started');
      watcher.watch(function(err, evt) {
        //console.log('watcher fired');
        if (!err)
        var evtName = evt.event;
        var logs = evt.args;

          if (evtName === "CreateWisp") {
            self.setWisp(evt.args.wispAddr);
          }
      });
    });
  },

  stopWatcher: function() {
    watcher = null;
  },

  refreshBalance: function() {
    var self = this;
    var wnt;

    WispNetworkToken.deployed().then(function(instance) {
      wnt = instance;
      return wnt.getBalance.call(self.account, {from: self.account});
    }).then(function(value) {
      $('.balance').text(value.valueOf() / 1000000);
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting balance; see log.");
    });
  },

  sendCoin: function() {
    var self = this;

    var amount = parseInt(document.getElementById("amount").value);
    var receiver = document.getElementById("receiver").value;

    this.setStatus("Initiating transaction... (please wait)");

    var wnt;
    WispNetworkToken.deployed().then(function(instance) {
      wnt = instance;
      return wnt.transfer(receiver, amount, {from: self.account});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalance();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error sending coin; see log.");
    });
  },

  setWisp: function(_addr) {
    var self = this;    
    self.currentWisp = self.wispFactory(_addr);
    self.wisps.push(self.currentWisp);
    window.wisp = self.currentWisp;
    self.refreshWisps();
    self.refreshBalance();
    self.getWispData(self.currentWisp)
  },

  refreshWisps: function() {
    var self = this;
    var selector = $('#WispSelect');
    selector.empty();
    self.wisps.forEach(function(wisp)  {      
      selector.append('<option value="' + wisp.address + '">' + wisp.address + '</option>')
    });    
  },

  findWisps: function() {
    var self = this;
    var contractAddress = $('.contract-address').text();
    self.wisps = [];

    var _owner = $('.accounts').val();

    console.log('looking for owner ' + _owner);

    WispNetworkToken.deployed().then(function(instance) {
      var event = instance.CreateWisp({}, {
        fromBlock:0, 
        toBlock: 'latest', 
        address: contractAddress, 
      },
      function(err, log) {                
        console.log(err)
        console.log(log)
        console.log(log.args.owner)
        console.log(_owner)
        var _addr = log.args.wispAddr;
        if (log.args.owner === _owner) {
          console.log('owner found')
          self.wisps.push(self.wispFactory(_addr));        
        }
        self.refreshWisps();
      });      
    })

  },

  getWispData: function(wisp) {
    console.log(Object.keys(wisp));
    $('.address').text(wisp.address);
    $('.weight').text(wisp.weight());
    $('.creator').text(wisp.creator());
    $('.owner').text(wisp.owner());
    $('.newOwner').text(wisp.newOwner());
  },

  follow: function(_addr) {
    Wisp.at(_Wisp).follow(_Wisp, {from: self.account, gas: 1000000});
  },

  unfollow: function(_addr) {
    Wisp.at(_Wisp).unfollow(_addr, {from: self.account, gas: 1000000});
  },

  isFollowing: function(_addr) {
    var self = this;
    self.setStatus('Checking Following... ');
    var wisp;
    Wisp.at(_Wisp).then(function(instance) {
      wisp = instance;      
      return wisp.isFollowing(_addr, {from: self.account, gas: 1000000});
    }).then(function(data) {
      console.log(data)
      console.log('Following Check Finished');
    })
  },

  getFollowing: function() {
    var self = this;
    self.setStatus('Getting Following... ');
    var wisp;
    Wisp.deployed().then(function(instance) {
      wisp = instance;

      return wisp.getFollowing(0, 5);
    }).then(function(data) {
      console.log(data)
      self.setStatus('Wisp Following Retrieved');
    })
  },

  setEvents: function() {
    var self = this;
    $('#WispSelect').change(function(e) {
      var el = this;
      var addr = el.value;
      self.wisps.forEach(function(wisp) {
        if (wisp.address === addr) {
          self.getWispData(wisp);
        }
      })
    });

    $('.accounts').change(function(e) {
      self.account = this.value;
      console.log(self.account);
      self.refreshBalance();
      self.findWisps();
    });
  },

  wispFactory: function(_addr) {
    var contract = web3.eth.contract(wisp_template.abi);
    var instance = contract.at(_addr);
    return instance;
  }
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 WispNetworkToken, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();  
  App.setEvents();
  App.findWisps();  
});

