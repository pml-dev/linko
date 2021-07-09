/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Linkoone implementation : © Geoffrey VOYER <geoffrey.voyer@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * linkoone.js
 *
 * Linkoone user interface script
 * 
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

define([
    "dojo", "dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/stock",
],
    function (dojo, declare) {
        return declare("bgagame.linkoone", ebg.core.gamegui, {
            constructor: function () {
                this.debug('linkoone constructor');
                this.cardwidth = 86;
                this.cardheight = 120;
                this.hoover_cardwidth = 229;
                this.hoover_cardheight = 320;
                this.typeSelected = -1; // Current type selected by the player

                // Both the weight and the id of "cards" on which players can click to play their cards.
                this.ADD_RIGHT_ID = 10000000;
                this.ADD_LEFT_ID = -10000000;

                // The "shift" from the previous type
                this.LEFT_SHIFT = -100;
                this.RIGHT_SHIFT = 100;

                this.DEBUG = false;

                this.smallFlockNumbers = null;
                this.bigFlockNumbers = null;
                this.typesNames = null;
                this.typesNamesPlural = null;
                this.numberOfCardsPerType = null;
                this.playersStock = null;

                this.zoomLevel = 1;
                this.orig_play_zone_height = null;
            },

            /*
                setup:
                
                This method must set up the game user interface according to current game situation specified
                in parameters.
                
                The method is called each time the game interface is displayed to a player, ie:
                _ when the game starts
                _ when a player refreshes the game page (F5)
                
                "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
            */

            setup: function (gamedatas) {
                this.debug("Starting game setup");

                this.smallFlockNumbers = gamedatas.smallFlockNumbers;
                this.bigFlockNumbers = gamedatas.bigFlockNumbers;
                this.typesNames = gamedatas.typesNames;
                this.typesNamesPlural = gamedatas.typesNamesPlural;
                this.numberOfCardsPerType = gamedatas.numberOfCardsPerType;

                // Player hand
                this.playerHand = this.createStockForCards(this, $('myhand'));

                // Discard
                this.discard = this.createStockForCards(this, $('discard'));
                this.discard.selectable = 0;
                this.discard.setOverlap(0.1, 0.1);
                this.discard.item_margin = 0;
                this.discard.order_items = false;

                // Bird lines
                this.lineStocks = [];
                for (var lineNumber = 0; lineNumber <= 3; lineNumber++) {
                    var line_stock = new ebg.stock();
                    line_stock.create(this, $('table_cards_line_' + lineNumber), this.cardwidth, this.cardheight);
                    line_stock.image_items_per_row = 1;
                    line_stock.centerItems = true;
                    line_stock.onItemCreate = dojo.hitch(this, 'setupCardLine');
                    line_stock.setSelectionAppearance('class');
                    
                    // Create cards types:
                    for (var cardType = 0; cardType <= 7; cardType++) {
                        // Build card type.
                        line_stock.addItemType(cardType, cardType, g_gamethemeurl + 'img/linkoone_cards.jpg', cardType);

                        // The lines below are used to add a transient animation
                        line_stock.addItemType(cardType + this.LEFT_SHIFT, this.ADD_LEFT_ID + 1, g_gamethemeurl + 'img/linkoone_cards.jpg', cardType);
                        line_stock.addItemType(cardType + this.RIGHT_SHIFT, this.ADD_RIGHT_ID - 1, g_gamethemeurl + 'img/linkoone_cards.jpg', cardType);
                    }

                    // Adding special cards for play on left and right.
                    line_stock.addItemType(this.ADD_LEFT_ID, this.ADD_LEFT_ID, g_gamethemeurl + 'img/transparent.png', 1);
                    line_stock.addItemType(this.ADD_RIGHT_ID, this.ADD_RIGHT_ID, g_gamethemeurl + 'img/transparent.png', 1);


                    this.lineStocks[lineNumber] = line_stock;
                }

                this.debug("gamedatas", this.gamedatas);
                // Cards in player's hand
                this.recreateHandFromData(this.gamedatas.hand);

                // Cards in lines
                for (var lineNumber in this.gamedatas.lines) {
                    this.recreateLineFromData(lineNumber, this.gamedatas.lines[lineNumber]);
                    this.lineStocks[lineNumber].setSelectionMode(1);
                    dojo.connect(this.lineStocks[lineNumber], 'onChangeSelection', this, dojo.partial(this.onLineSelectionChanged, lineNumber));
                }

                this.initiateCounts();

                this.initiatePlayersScores(this.gamedatas);

                // Setting up player boards
                for (var player_id in gamedatas.players) {

                    // Setting up players boards
                    var player_board_div = $('player_board_' + player_id);
                    
                    dojo.place(this.format_block('linkoone_player_board', { 'id': player_id, 'number': this.counts.players[player_id] }), player_board_div);
                    
                    var won_cards_div = $('won_cards_p' + player_id);
                    for (var cardType = 0; cardType <= 7; cardType++) {
                        dojo.place(this.format_block('won_cards_type_item', { 'id': player_id, 'type': cardType, 'number': this.playersScores[player_id][cardType] }), won_cards_div);
                        if (this.playersScores[player_id][cardType] == 0) {
                            // Some transparency to make it easier to check on important counters
                            dojo.style('won_cards_p'+player_id+'_t'+cardType, 'opacity', 0.5);
                        }
                    }
                }
                dojo.connect(this.playerHand, 'onChangeSelection', this, 'onPlayerHandSelectionChanged');

                // Played cards zones
                if (!this.isSpectator) {
                    var current_player = this.player_id;
                    var player = gamedatas.turn[current_player];

                    dojo.place(this.format_block('jstpl_player_collection', {
                        player_id : current_player,
                        panel_title : _('Your collection'),
                    }), 'all_rows');

                    while (player !== current_player ) {
                        dojo.place(this.format_block('jstpl_player_collection', {
                            player_id : player,
                            panel_title : '<span style="color: #'+gamedatas.players[player]['color']+'">' + _("${player_name}'s collection").replace('${player_name}', gamedatas.players[player]['name']) +'</span>',
                        }), 'all_rows');

                        player = gamedatas.turn[player];
                    }
                } else {
                    for( var player_id in gamedatas.players )
                    {
                        dojo.place(this.format_block('jstpl_player_collection', {
                            player_id : player_id,
                            panel_title : '<span style="color: #'+gamedatas.players[player_id]['color']+'">' + _("${player_name}'s collection").replace('${player_name}', gamedatas.players[player_id]['name']) +'</span>',
                        }), 'all_rows');
                    }
                }

                // Players played cards
                this.playersStock = {};
                for (var player_id in gamedatas.players) {
                  this.playersStock[player_id] = this.createStockForCards(this, $('played_' + player_id));
                  this.playersStock[player_id].setSelectionMode(0);
                }

                for( var player_id in gamedatas.players )
                {
                    for (var i in gamedatas.cards_played[player_id]) {
                        var card = gamedatas.cards_played[player_id][i];
                        this.playersStock[player_id].addToStockWithId(card.type, card.id);
                    }
                }

                //Add hoovers.
                for (var cardType = 0; cardType <= 7; cardType++) {
                    for (var player_id in gamedatas.players) {
                        this.setupCard($('won_cards_p' + player_id + '_t' + cardType + '_logo'), cardType);
                    }
                }

                this.addTooltipToClass( 'hand_card_number', _('Number of cards in hand'), '' );

                // Adding deck/discard counts
                $('deck_number').innerHTML = this.counts.deck;
                $('discard_number').innerHTML = this.counts.discard;

                // Events
                dojo.connect( $('zoomin_left'), 'onclick', this, 'onZoomIn' );
                dojo.connect( $('zoomout_left'), 'onclick', this, 'onZoomOut' );
                dojo.connect( $('zoomin_right'), 'onclick', this, 'onZoomIn' );
                dojo.connect( $('zoomout_right'), 'onclick', this, 'onZoomOut' );

                dojo.connect( $('deck'), 'onclick', this, 'onDrawCard' );

                // Setup game notifications to handle (see "setupNotifications" method below)
                this.setupNotifications();

                // Setup proper zoom if needed
                this.autoZoom();

                this.debug("Ending game setup");
            },

            autoZoom: function( )
            {
                var landscape = !dojo.hasClass( 'ebd-body', 'mobile_version' );

                if (landscape) {
                    // Viewport height excluding the toolbar
                    var vpt_height = document.documentElement.clientHeight;

                    // Get position of the hand
                    var hand_coords = dojo.coords('myhand_wrap', true);
                    var hand_bottom_y = hand_coords.y + hand_coords.h;

                    // Get position of the deck
                    var deck_coords = dojo.coords('deck_container', true);
                    var deck_bottom_y = deck_coords.y + deck_coords.h;

                    hand_bottom_y = Math.max(deck_bottom_y, hand_bottom_y);

                    // We must substract the loading bars height if they are visible
                    if (dojo.style('connect_status', 'display') != 'none') {
                        var bar_coords = dojo.coords('connect_status', true);
                        hand_bottom_y -= bar_coords.h;
                    }
                    if (dojo.style('connect_gs_status', 'display') != 'none') {
                        var bar_coords = dojo.coords('connect_gs_status', true);
                        hand_bottom_y -= bar_coords.h;
                    }
                    if (dojo.style('log_history_status', 'display') != 'none') {
                        var bar_coords = dojo.coords('log_history_status', true);
                        hand_bottom_y -= bar_coords.h;
                    }
                    
                    // We want the hand bottom 10% above the bottom of the viewport so that the first collection is partly visible
                    var desired_y = vpt_height * 0.86;
                    var zoom_needed = desired_y / hand_bottom_y;
                    zoom_needed = Math.min(zoom_needed, 1.65);
                    zoom_needed = Math.max(zoom_needed, 0.25);
                    
                    this.zoomLevel = zoom_needed;
                    console.log('autoZoom landscape mode -> ' + this.zoomLevel);

                    this.applyZoom();
                } else {
                    // Temporarily disable framework zoom for chrome mobile
                    dojo.style('page-content', 'zoom', 'normal' );
                    
                    // Viewport width excluding the toolbar
                    var vpt_width = document.documentElement.clientWidth;
                    
                    // Get position of the hand
                    var hand_coords = dojo.coords('myhand_wrap', true);
                    var hand_width = hand_coords.w;

                    // In portrait mode, we want the hand to hold about 4 cards in width. Taking into account deck/discard, that's 280 + 90*4 + 4*5 = 670
                    var desired_w = 670;
                    var zoom_needed = vpt_width / desired_w;
                    zoom_needed = Math.min(zoom_needed, 1.75);
                    zoom_needed = Math.max(zoom_needed, 0.25);

                    this.zoomLevel = zoom_needed;
                    console.log('autoZoom portrait mode -> ' + this.zoomLevel);

                    this.applyZoom();
                    this.onScreenWidthChange();
                }
            },

            tmpUnzoom: function()
            {
                dojo.style('linkoone_zoomable', 'transform', 'scale(1)');
            },

            tmpRezoom: function()
            {
                dojo.style('linkoone_zoomable', 'transform', 'scale('+this.zoomLevel+')');
            },

            applyZoom: function()
            {
                if (this.orig_play_zone_height === null) {
                    var pz_coords = dojo.coords('linkoone_play_zone', true);
                    this.orig_play_zone_height = pz_coords.h;
                }

                dojo.style('linkoone_zoomable', 'transform', 'scale('+this.zoomLevel+')');
                dojo.style('linkoone_zoomable', 'transform-origin', 'top');
                this.onScreenWidthChange();
                
                // Lines
                //dojo.style('lines_fields_wrapper', 'width', ((1/this.zoomLevel)*100)+'%');
                //dojo.style('lines_fields_wrapper', 'left', ((100-(1/this.zoomLevel)*100)/2)+'%');

                // Hand
                dojo.style('linkoone_below', 'width', ((1/this.zoomLevel)*100)+'%');
                dojo.style('linkoone_below', 'left', ((100-(1/this.zoomLevel)*100)/2)+'%');

                // Overall play zone height
                dojo.style('linkoone_play_zone', 'min-height', (this.orig_play_zone_height*this.zoomLevel)+'px');
                
                // Update display for all stocks
                this.updateStocksDisplay();
                
            },

            onZoomIn: function( evt )
            {
                evt.preventDefault();
                if (this.zoomLevel >= 1.65) {
                    this.showMessage("This is the maximum in-game zoom available. Please note that you can also use your browser zoom if needed.", "info");
                    return;
                }
                this.zoomLevel = this.zoomLevel + 0.1;
                console.log('onZoomIn -> ' + this.zoomLevel);

                this.applyZoom( this.zoomLevel );
            },
            
            onZoomOut: function( evt )
            {
                evt.preventDefault();
                if (this.zoomLevel <= 0.25) {
                    this.showMessage("This is the minimum in-game zoom available. Please note that you can also use your browser zoom if needed.", "info");
                    return;
                }
                this.zoomLevel = this.zoomLevel - 0.1;
                console.log('onZoomIn -> ' + this.zoomLevel);

                this.applyZoom( this.zoomLevel );
            },

            updateStocksDisplay: function( evt )
            {
                this.playerHand.updateDisplay();
                for (var lineNumber in this.gamedatas.lines) {
                    this.lineStocks[lineNumber].updateDisplay();
                }
                for (var player_id in this.gamedatas.players) {
                    this.playersStock[player_id].updateDisplay();
                }
            },

            createStockForCards: function(page, element) {
                var stock = new ebg.stock();
                stock.create(page, element, this.cardwidth, this.cardheight);
                stock.image_items_per_row = 1;

                for (var cardType = 0; cardType <= 7; cardType++) {
                    stock.addItemType(cardType, cardType, g_gamethemeurl + 'img/linkoone_cards.jpg', cardType);
                }

                stock.onItemCreate = dojo.hitch( this, 'setupCard' );
                stock.centerItems = true;
                stock.setSelectionAppearance('class');
                
                return stock;
            },
            

            ///////////////////////////////////////////////////
            //// Game & client states

            // onEnteringState: this method is called each time we are entering into a new game state.
            //                  You can use this method to perform some user interface changes at this moment.
            //
            onEnteringState: function (stateName, args) {
                this.debug('Entering state: ' + stateName);

                // Hand cards not selectable
                this.playerHand.setSelectionMode(0);

                // End of line spaces hidden
                dojo.query('.line_side_space').addClass('line_side_space_hidden');

                // Reset deck cursor
                dojo.style('deck', 'cursor', '');

                switch (stateName) {

                    case 'playerTurn':
                        if (this.isCurrentPlayerActive()) {
                            // Hand cards are selectable
                            this.playerHand.setSelectionMode(2);
                        }
                        break;

                    case 'playerDrawChooser':
                        if (this.isCurrentPlayerActive()) {
                            this.addActionButton('drawCard_button', _('Draw'), 'onDrawCard');
                            dojo.style('deck', 'cursor', 'pointer');
                            if (this.playerHand.getAllItems().length == 0) {
                                this.addActionButton('pass_button', _('Pass and trigger new round'), 'onPassDraw');
                            }
                            else {
                                this.addActionButton('pass_button', _('Pass'), 'onPassDraw');
                            }
                        }
                        break;

                    case 'playerFlockChooser':
                        if (this.isCurrentPlayerActive()) {
                            // Hand cards are selectable
                            this.playerHand.setSelectionMode(2);

                            if (!this.checkIfFlockPossible()) {
                                this.gamedatas.gamestate.descriptionmyturn = _('${you} cannot complete a flock at the moment');
                                this.updatePageTitle();
                            } else {
                                this.addActionButton('completeFlock_button', _('Fly home'), 'onCompleteFlock');
                            }
                            this.addActionButton('pass_button', _('Pass'), 'onPassFlock');

                            this.addTimerIfNoFlockCanBeMade();
                        }
                        break;

                    case 'dummmy':
                        break;
                }
            },

            // onLeavingState: this method is called each time we are leaving a game state.
            //                 You can use this method to perform some user interface changes at this moment.
            //
            onLeavingState: function (stateName) {
                this.debug('Leaving state: ' + stateName);

                switch (stateName) {

                    /* Example:
                    
                    case 'myGameState':
                    
                        // Hide the HTML block we are displaying only during this game state
                        dojo.style( 'my_html_block_id', 'display', 'none' );
                        
                        break;
                   */


                    case 'dummmy':
                        break;
                }
            },

            // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
            //                        action status bar (ie: the HTML links in the status bar).
            //        
            onUpdateActionButtons: function (stateName, args) {
                this.debug('onUpdateActionButtons: ' + stateName);

                if (this.isCurrentPlayerActive()) {
                    switch (stateName) {
                        /*               
                                         Example:
                         
                                         case 'myGameState':
                                            
                                            // Add 3 action buttons in the action status bar:
                                            
                                            this.addActionButton( 'button_1_id', _('Button 1 label'), 'onMyMethodToCall1' ); 
                                            this.addActionButton( 'button_2_id', _('Button 2 label'), 'onMyMethodToCall2' ); 
                                            this.addActionButton( 'button_3_id', _('Button 3 label'), 'onMyMethodToCall3' ); 
                                            break;
                        */
                    }
                }
            },

            ///////////////////////////////////////////////////
            //// Utility methods

            /*
            
                Here, you can defines some utility methods that you can use everywhere in your javascript
                script.
            
            */

            setupCardLine: function (card_div, card_type_id, card_id) {
                var line_id = card_div.id.split('_')[3];
                
                if (card_type_id == this.ADD_LEFT_ID) {
                    dojo.addClass( card_div, 'line_side_space' );
                    this.addTooltip( card_div.id, '', _('Lay birds on the left of this line') );

                    // Sky left
                    dojo.place( '<div class="sky_left"></div>', card_div.id );
                    // Wire left
                    dojo.place( '<div class="wire_left"></div>', card_div.id );
                    // Sky center left
                    dojo.place( '<div id="sky_left_ext_'+line_id+'" class="sky_center"></div>', card_div.id );
                    // Wire center left
                    dojo.place( '<div id="wire_left_ext_'+line_id+'" class="wire_center"></div>', card_div.id );
                    return;
                } else if (card_type_id == this.ADD_RIGHT_ID) {
                    dojo.addClass( card_div, 'line_side_space' );
                    this.addTooltip( card_div.id, '', _('Lay birds on the right of this line') );

                    // Sky right
                    dojo.place( '<div class="sky_right"></div>', card_div.id );
                    // Wire right
                    dojo.place( '<div class="wire_right"></div>', card_div.id );
                    // Sky center right
                    dojo.place( '<div id="sky_right_ext_'+line_id+'" class="sky_center sky_center_ext_right"></div>', card_div.id );
                    // Wire center right
                    dojo.place( '<div id="wire_right_ext_'+line_id+'" class="wire_center wire_center_ext_right"></div>', card_div.id );
                    return;
                } else {
                    // Sky center (between bird cards)
                    dojo.place( '<div class="sky_center"></div>', card_div.id );
                    // Wire center (between bird cards)
                    dojo.place( '<div class="wire_center"></div>', card_div.id );
                }
                
                dojo.addClass( card_div, 'line_card' );

                // Animate expanding the sky
                var cards_num = parseInt(this.lineStocks[line_id].getItemNumber()) - 2; // We substract extremity cards
                var card_width = parseInt(dojo.style(card_div.id, 'width')) + 4; // We add space between the cards
                var sky_width = 4 + card_width * cards_num;
                if ($('sky_left_ext_'+line_id) !== null) {
                    dojo.animateProperty({
                      node:'sky_left_ext_'+line_id,
                      duration: 1000,
                      delay: 0,
                      properties: {
                          width: sky_width
                      }
                    }).play();
                    dojo.animateProperty({
                      node:'wire_left_ext_'+line_id,
                      duration: 1000,
                      delay: 0,
                      properties: {
                          width: sky_width
                      }
                    }).play();
                }
                if ($('sky_right_ext_'+line_id) !== null) {
                    dojo.animateProperty({
                      node:'sky_right_ext_'+line_id,
                      duration: 1000,
                      delay: 0,
                      properties: {
                          width: sky_width,
                          left: -sky_width
                      }
                    }).play();
                    dojo.animateProperty({
                      node:'wire_right_ext_'+line_id,
                      duration: 1000,
                      delay: 0,
                      properties: {
                          width: sky_width,
                          left: -sky_width
                      }
                    }).play();
                }

                this.setupCard(card_div, card_type_id, card_id);
            },

            setupCard: function (card_div, card_type_id, card_id) {
                // Adjust type for transient
                if (card_type_id <= 7 + this.LEFT_SHIFT)
                    card_type_id -= this.LEFT_SHIFT;
                if (card_type_id >= this.RIGHT_SHIFT)
                    card_type_id -= this.RIGHT_SHIFT;

                // Use different bird images depending upon the card id (in the physical game all cards are slightly different)
                // NB: for birds with 20 cards, we use only 17 so that the sprite img is not bigger than 4096 (mobile browsers constraint)
                var xpos = 0;
                if (typeof card_id != 'undefined') {
                    var id = card_div.id.split('_')[card_div.id.split('_').length - 1];
                    xpos = (id % Math.min(this.numberOfCardsPerType[card_type_id], 17));
                    var curypos = dojo.style(card_div.id, 'backgroundPosition') != '' ? dojo.style(card_div.id, 'backgroundPosition').split(' ')[1] : '0%';
                    var newbgpos = -(xpos*100)+'% '+curypos;
                    dojo.style(card_div.id, 'backgroundPosition', newbgpos);
                }
                
                var html = '<div class="cbd_tooltip">';
                html += '<h3>' + _(this.typesNames[card_type_id]) + '</h3>';
                html += '<hr />';
                html += '<p>' + _('Small flock:') + ' ' + this.smallFlockNumbers[card_type_id] + '</p>';
                html += '<p>' + _('Big flock:') + ' ' + this.bigFlockNumbers[card_type_id] + '</p>';
                html += '<p>' + _('Number of birds:') + ' ' + this.numberOfCardsPerType[card_type_id] + '</p>';
                html += '<div class="tooltipCard" style="background-position: -'+(xpos*100)+'% -'+ (card_type_id * 100) +'%"></div>';
                
                this.addTooltipHtml(card_div.id, html);
            },

            selectAllOfGivenType: function (typeSelected) {
                this.playerHand.items.forEach(function (element) {
                    if (element.type == typeSelected) {
                        this.playerHand.selectItem(element.id);
                    }
                    else {
                        this.playerHand.unselectItem(element.id);
                    }
                }.bind(this));
            },

            initiatePlayersScores: function (gamedatas) {
                this.playersScores = {};
                for (var player_id in gamedatas.players) {
                    this.playersScores[player_id] = {};
                    for (var cardType = 0; cardType <= 7; cardType++) {
                        this.playersScores[player_id][cardType] = 0;
                    }
                }

                for (var i in this.gamedatas.won) {
                    var card = this.gamedatas.won[i];
                    this.playersScores[card.location_arg][card.type] += 1;
                }
                this.debug("Player Scores initailized : ", this.playersScores);

            },

            initiateCounts: function () {
                this.counts = { players: {} };
                for (var player_id in this.gamedatas.players) {
                    // The server method doesn't return value for a player who doesn't have cards.
                    this.counts.players[player_id] = this.gamedatas.count.players[player_id] || 0;
                }
                this.counts.deck = this.gamedatas.count.deck;
                this.counts.discard = this.gamedatas.count.discard;
            },

            recreateLineFromData: function (lineNumber, lineData) {

                this.lineStocks[lineNumber].removeAll();
                this.addCardsToLine(lineNumber, lineData, { elt: "deck" });

                this.debug("items weight updated : ", this.lineStocks[lineNumber].item_type);

                this.lineStocks[lineNumber].addToStockWithId(this.ADD_LEFT_ID, this.ADD_LEFT_ID);
                this.lineStocks[lineNumber].addToStockWithId(this.ADD_RIGHT_ID, this.ADD_RIGHT_ID);
            },

            addCardToLine: function (lineNumber, card, from, specificLocation) {
                if (typeof from == 'undefined' && $( this.lineStocks[lineNumber].getItemDivId( card.id ) ) !== null )
                    from = this.lineStocks[lineNumber].getItemDivId( card.id );
                    
                this.lineStocks[lineNumber].addToStockWithId(card.type, card.id, from, specificLocation);
            },

            addCardsToLine: function (lineNumber, cards, from, position) {
                for (var i in cards) {
                    var card = cards[i];
                    var origin = from['elt'] || from['stock'].concat('_item_'.concat(card.id));

                    // If we have a position, we are in a transient state, put the card in a specific type so that it stays on the exterme left or right.
                    if (position == "1")
                        card.type = toint(card.type) + this.RIGHT_SHIFT;
                    if (position == "-1")
                        card.type = toint(card.type) + this.LEFT_SHIFT;

                    this.addCardToLine(lineNumber, card, origin);

                    // If we don't have a position, we are in a definitive mode, therefore, we should update type weights so that cards are correctly ordered.
                    if (!position)
                        this.updateTypeWeight(lineNumber, card);
                }
                this.debug("items weight updated : ", this.lineStocks[lineNumber].item_type);
            },

            addCardsToHand: function (cards, from) {
                for (var i in cards) {
                    var card = cards[i];
                    var origin = from['elt'] || from['stock'].concat('_item_'.concat(card.id));
                    this.playerHand.addToStockWithId(card.type, card.id, origin);
                }
            },

            removeFromLine: function (lineNumber, cards, destination) {
                var origin = destination ? destination['elt'] : undefined;
                for (var i in cards) {
                    var card = cards[i];
                    this.lineStocks[lineNumber].removeFromStockById(card.id, origin);
                }
            },

            removeFromHand: function (cards) {
                for (var i in cards) {
                    var card = cards[i];
                    this.playerHand.removeFromStockById(card.id);
                }
            },

            removeTypeFromHand: function (type, to) {
                elt_to_remove = [];
                this.playerHand.items.forEach(function (element) {
                    if (element.type == type) {
                        elt_to_remove.push(element.id);
                    }
                });
                elt_to_remove.forEach(function (id) { this.playerHand.removeFromStockById(id, to); }.bind(this));
            },

            moveToAnotherStock: function (item_ids, fromstock, tostock) {
                elt_to_remove = [];
                fromstock.items.forEach(function (element) {
                    if (this.inArray(element.id,item_ids)) {
                        elt_to_remove.push(element);
                    }
                }.bind(this));
                elt_to_remove.forEach(
                    function (elt) {
                        tostock.addToStockWithId(elt.type, elt.id, fromstock.getItemDivId(elt.id));
                        fromstock.removeFromStockById(elt.id);
                    }.bind(this)
                );
            },

            inArray: function(needle, haystack) {
                var length = haystack.length;
                for(var i = 0; i < length; i++) {
                    if(haystack[i] == needle) return true;
                }
                return false;
            },

            recreateHandFromData: function (handData, from) {
                for (var i in handData) {
                    var card = handData[i];
                    this.playerHand.addToStockWithId(card.type, card.id, from);
                }
            },

            updateScore: function (player_id, type, cards_won) {
                this.debug("Updating scores");
                this.playersScores[player_id][type] += cards_won;

                var won_cards_elt = $('won_cards_p' + player_id + '_t' + type + '_score');
                dojo.place(this.format_block('won_cards_type_item_number', { 'id': player_id, 'type': type, 'number': this.playersScores[player_id][type] }), won_cards_elt, "replace");
                if (this.playersScores[player_id][type] != 0) {
                    // Remove transparency to make it easier to check on important counters
                    dojo.style('won_cards_p'+player_id+'_t'+type, 'opacity', '');
                }

                // I have no idea why calling dojo addClass after immediately after dojo place skips the animation while correctling setting the new class...
                // So here are those 100s of delay as a workaround.
                setTimeout(function () { dojo.addClass('won_cards_p' + player_id + '_t' + type + '_score', 'bird_score_highlight') }, 100);
                setTimeout(function () { dojo.removeClass('won_cards_p' + player_id + '_t' + type + '_score', 'bird_score_highlight') }, 5100);
            },

            updateHandCount: function (player_id, new_number) {
                this.counts.players[player_id] = new_number;
                if ( $('hand_card_number_p'+player_id) !== null ) {
                    $('hand_card_number_p'+player_id).innerHTML = this.counts.players[player_id];
                }
            },

            updateHandCountWithDelta: function (player_id, delta) {
                var new_count = toint(this.counts.players[player_id]) + toint(delta);
                this.updateHandCount(player_id, new_count);
            },

            getTypeCount: function () {
                var typeCount = [0, 0, 0, 0, 0, 0, 0, 0];
                var items = this.playerHand.getAllItems();
                for (var i in items) {
                    var item = items[i];
                    typeCount[item.type] += 1;
                }
                return typeCount
            },

            checkIfFlockPossible: function () {
                var minimumFlockNumber = [2, 3, 3, 4, 4, 5, 6, 6];
                var typeCount = this.getTypeCount();

                for (var type in minimumFlockNumber) {
                    if (typeCount[type] >= minimumFlockNumber[type]) {
                        return true;
                    }
                }
                return false;
            },

            addTimerIfNoFlockCanBeMade: function () {
                this.debug("Flock Possible?", this.checkIfFlockPossible());
                if (!this.checkIfFlockPossible()) {
                    // If the player can't make a flock, make a timer that would automatically play the pass function
                    var seconds = Math.floor((Math.random() * 9) + 3);
                    dojo.query("#pass_button")[0].textContent = _('Pass') + ' (' + seconds + ')';

                    // Reduce the seconds every second, and if we reach 0 click the button
                    var passInterval = window.setInterval(function () {
                        if (dojo.query("#pass_button").length == 0) {
                            clearInterval(passInterval);
                        }
                        else {
                            seconds -= 1;
                            if (seconds == -1) {
                                clearInterval(passInterval);
                                document.getElementById("pass_button").click();
                            }
                            else {
                                dojo.query("#pass_button")[0].textContent = _("Pass") + " (" + seconds + ")";
                            }
                        }
                    }, 1000);
                }
            },

            updateDeckCount: function (newDeckCount, newDiscardCount) {
                this.counts.deck = newDeckCount;
                this.counts.discard = newDiscardCount;

                $('deck_number').innerHTML = this.counts.deck;
                $('discard_number').innerHTML = this.counts.discard;
            },

            updateDeltaDeckCount: function (deckCardsDrawn, cardsDiscarded) {
                this.updateDeckCount(toint(this.counts.deck) - toint(deckCardsDrawn), toint(this.counts.discard) + toint(cardsDiscarded));
            },

            collectCards: function (line_id, collected_cards, played_cards, destination) {
                // Reset temporary z-index used when adding cards to the line
                dojo.style('table_cards_line_'+line_id, 'zIndex', 'auto');
                
                if (!destination) {
                    this.tmpUnzoom();
                    this.addCardsToHand(collected_cards, { stock: 'table_cards_line_' + line_id });
                    this.tmpRezoom();
                }
                this.removeFromLine(line_id, collected_cards, destination);
                this.changeBackType(line_id, played_cards, (collected_cards.length == 0));
            },

            changeBackType: function (lineId, playedCards, noCardsCollected) {
                playedCards.forEach(function (card) {
                    var specificLocation = (card.type < -90 && noCardsCollected ? ':first' : undefined);
                    if (card.type > 90)
                        card.type = toint(card.type) - this.RIGHT_SHIFT;
                    if (card.type < -90)
                        card.type = toint(card.type) - this.LEFT_SHIFT;
                    //this.removeFromLine(lineId, card.id); // No need to remove, it will be destroyed if replaced
                    this.tmpUnzoom();
                    this.addCardToLine(lineId, card, undefined, specificLocation);                    
                    this.updateTypeWeight(lineId, card);
                    this.tmpRezoom();
                }.bind(this));
            },

            updateTypeWeight: function (lineId, card) {
                // Changing items weight will ensure that we have good order for cards. (Still useful?)
                // Dev note : Computed property names might cause troubles to IE users, otherwise they would be more elegant { [card.type]: toint(card.location_arg) }.
                var typeWeightDict = {};
                typeWeightDict[card.type] = toint(card.location_arg);
                this.lineStocks[lineId].changeItemsWeight(typeWeightDict);
            },

            debug: function () {
                if (this.DEBUG)
                    console.log.apply(null, arguments);
            },

            ///////////////////////////////////////////////////
            //// Player's action

            onPlayerHandSelectionChanged: function (control_name, item_id) {
                if (this.playerHand.isSelected(item_id)) {
                    var selected_type = this.playerHand.items.filter(function (elt) { return elt.id == item_id })[0].type;
                    this.selectAllOfGivenType(selected_type);
                    this.typeSelected = selected_type;

                    if( this.checkAction( 'play', true ) ) {
                        // Display end of line spaces
                        dojo.query('.line_side_space').removeClass('line_side_space_hidden');
                    }
                    if( this.checkAction( 'completeFlock', true ) && this.checkIfFlockPossible() ) {
                        var selected = this.playerHand.getSelectedItems();
                        var count = selected.length;
                        
                        if (count >= this.bigFlockNumbers[this.typeSelected]) {
                            this.gamedatas.gamestate.descriptionmyturn = _('Complete this big flock? (%d birds)').replace('%d', count);
                        } else if (count >= this.smallFlockNumbers[this.typeSelected]) {
                            this.gamedatas.gamestate.descriptionmyturn = _('Complete this small flock? (%d birds)').replace('%d', count);
                        } else {
                            this.gamedatas.gamestate.descriptionmyturn = _('${you} may complete a flock');
                        }

                        this.updatePageTitle();
                        this.addActionButton('completeFlock_button', _('Fly home'), 'onCompleteFlock');
                        this.addActionButton('pass_button', _('Pass'), 'onPassFlock');
                    }
                }
                else {
                    this.playerHand.unselectAll();
                    this.typeSelected = -1;

                    // Hide end of line spaces
                    dojo.query('.line_side_space').addClass('line_side_space_hidden');

                    if( this.checkAction( 'completeFlock', true ) && this.checkIfFlockPossible() ) {
                        this.gamedatas.gamestate.descriptionmyturn = _('${you} may complete a flock');
                        
                        this.updatePageTitle();
                        this.addActionButton('completeFlock_button', _('Fly home'), 'onCompleteFlock');
                        this.addActionButton('pass_button', _('Pass'), 'onPassFlock');
                    }
                }
            },

            onLineSelectionChanged: function (line_id, control_name, item_id) {
                this.lineStocks[line_id].unselectAll();
                if (item_id == this.ADD_RIGHT_ID && this.typeSelected >= 0) {
                    this.play(this.typeSelected, line_id, 1);
                }
                if (item_id == this.ADD_LEFT_ID && this.typeSelected >= 0) {
                    this.play(this.typeSelected, line_id, -1);
                }
            },

            play: function (type, lineNumber, position) {
                var action = "play";
                if( !this.checkAction( action ) ) return;
                
                var params = { lock: true, type: type, line: lineNumber, position: position };
                this.debug("Play type", type, "on line", lineNumber, "position", position);

                this.ajaxcall("/" + this.game_name + "/" + this.game_name + "/" + action + ".html",
                    params,
                    this,
                    function (result) {
                        this.typeSelected = -1;
                        
                        // Hide end of line spaces
                        dojo.query('.line_side_space').addClass('line_side_space_hidden');
                    },
                    function (is_error) {
                    });
            },

            onDrawCard: function () {
                this.debug("Player want to draw two cards");
                var action = "draw";
                if( !this.checkAction( action ) ) return;
                
                var params = { lock: true };
                this.ajaxcall("/" + this.game_name + "/" + this.game_name + "/" + action + ".html",
                    params,
                    this,
                    function (result) {
                        this.typeSelected = -1;
                    },
                    function (is_error) {
                    });
            },

            onPassDraw: function () {
                this.debug("Player wants to pass (Draw)");
                var action = "passDraw";
                if( !this.checkAction( "pass" ) ) return;
                
                var params = { lock: true };
                this.ajaxcall("/" + this.game_name + "/" + this.game_name + "/" + action + ".html",
                    params,
                    this,
                    function (result) {
                    },
                    function (is_error) {
                    });
            },

            onPassFlock: function () {
                this.debug("Player wants to pass (Flock)");
                var action = "passFlock";
                if( !this.checkAction( "pass" ) ) return;
                
                var params = { lock: true };
                this.ajaxcall("/" + this.game_name + "/" + this.game_name + "/" + action + ".html",
                    params,
                    this,
                    function (result) {
                    },
                    function (is_error) {
                    });
            },

            onCompleteFlock: function () {
                this.debug("Player wants to complete a Flock");
                if (this.typeSelected == -1) {
                    this.showMessage("You must select a flock first", "error");
                    return;
                }

                var action = "completeFlock";
                if( !this.checkAction( action ) ) return;
                
                var params = { lock: true, 'type': this.typeSelected };

                this.ajaxcall("/" + this.game_name + "/" + this.game_name + "/" + action + ".html",
                    params,
                    this,
                    function (result) {
                    },
                    function (is_error) {
                    });
            },

            ///////////////////////////////////////////////////
            //// Reaction to cometD notifications

            /*
                setupNotifications:
                
                In this method, you associate each of your game notifications with your local method to handle it.
                
                Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                      your linkoone.game.php file.
            
            */
            setupNotifications: function () {
                this.debug('notifications subscriptions setup');

                // Waiting 
                this.notifqueue.setSynchronous( 'wait2seconds', 2000 );
                
                dojo.subscribe('playCard', this, "notif_cardPlayed");
                this.notifqueue.setSynchronous('playCard', 2500);
                dojo.subscribe('flockCompleted', this, "notif_flockCompleted");
                this.notifqueue.setSynchronous('flockCompleted', 1000);
                dojo.subscribe('lineCompleted', this, "notif_lineCompleted");
                dojo.subscribe('handDiscarded', this, "notif_handDiscarded");
                dojo.subscribe('handUpdated', this, "notif_handUpdated");
                dojo.subscribe('newHandCount', this, "notif_newHandCount");
                dojo.subscribe('cardsDrawn', this, "notif_cardsDrawn");
                dojo.subscribe('endOfGameScore', this, "notif_endOfGameScore");
                this.notifqueue.setSynchronous('endOfGameScore', 2000);
            },

            notif_endOfGameScore: function (notif) {
                this.debug('notif_endOfGameScore', notif.args);
                for (var i in notif.args.scores) {
                    var score = notif.args.scores[i];

                    this.scoreCtrl[ score.id ].toValue( score.score );
                }
            },

            notif_cardPlayed: function (notif) {
                this.debug('notif_cardPlayed', notif.args);

                // Set temporary z-index on the line so that cards fly above other lines
                dojo.style('table_cards_line_'+notif.args.line_id, 'zIndex', 1);

                // No transient type if we don't already have birds of this type in the line
                var same_type = this.lineStocks[notif.args.line_id].getItemsByType(notif.args.type_id);
                if (same_type.length == 0) {
                    // No collected cards. Directly set the proper weight and add the cards.
                    this.changeBackType(notif.args.line_id, notif.args.played_cards, false);
                    if (notif.args.player_id == this.player_id) {
                        this.tmpUnzoom();
                        this.addCardsToLine(notif.args.line_id, notif.args.played_cards, { stock: 'myhand' });
                        this.tmpRezoom();
                        this.removeFromHand(notif.args.played_cards);
                    } else {
                        this.tmpUnzoom();
                        var destination = { elt: 'hand_cards_p' + notif.args.player_id };
                        this.addCardsToLine(notif.args.line_id, notif.args.played_cards, destination);
                        this.tmpRezoom();
                    }
                } else {
                    if (notif.args.player_id == this.player_id) {
                        // 1. Add card with transient type
                        this.tmpUnzoom();
                        this.addCardsToLine(notif.args.line_id, notif.args.played_cards, { stock: 'myhand' }, notif.args.position);
                        this.tmpRezoom();
                        this.removeFromHand(notif.args.played_cards);

                        // 2. Collect the cards and set back the type to normal
                        setTimeout(this.collectCards.bind(this, notif.args.line_id, notif.args.collected_cards, notif.args.played_cards), 1500);
                    }
                    else {
                        // 1. Add card with transient type
                        var destination = { elt: 'hand_cards_p' + notif.args.player_id };
                        this.addCardsToLine(notif.args.line_id, notif.args.played_cards, destination, notif.args.position);

                        // 2. Collect the cards and set back the type to normal
                        setTimeout(this.collectCards.bind(this, notif.args.line_id, notif.args.collected_cards, notif.args.played_cards, destination), 1500);
                    }
                }

                this.updateHandCountWithDelta(notif.args.player_id, toint(notif.args.collected_cards.length) - toint(notif.args.played_cards.length));
            },

            notif_cardsDrawn: function (notif) {
                this.debug('notif_cardsDrawn', notif.args);
                this.tmpUnzoom();
                for (var i in notif.args.new_cards) {
                    var card = notif.args.new_cards[i];

                    this.playerHand.addToStockWithId(card.type, card.id, 'deck');
                }
                this.tmpRezoom();
            },

            notif_handDiscarded: function (notif) {
                this.debug('notif_handDiscarded', notif.args);

                if (notif.args.player_id == this.player_id) {
                    // Discard cards in hand
                    var allitems = notif.args.cards_to_discard;
                    var allids = [];
                    for( var i in allitems )
                    {
                        allids.push( allitems[ i ].id );
                    }
                    this.moveToAnotherStock(allids, this.playerHand, this.discard);
                } else {
                    // Cards move from the player panels to the discard
                    var allitems = notif.args.cards_to_discard;
                    var count = 0;
                    var delay = Math.min(300, Math.round(2000 / notif.args.number_to_discard));
                    for( var i in allitems )
                    {
                        var item = allitems[ i ];
                        // Slows down the interface, better not do that
                        //setTimeout( function(item, player_id) {
                        //    this.discard.addToStockWithId(item.type, item.id, 'hand_cards_p'+player_id);
                        //}.bind(this, item, notif.args.player_id), count*delay);
                        this.discard.addToStockWithId(item.type, item.id, 'hand_cards_p'+notif.args.player_id);
                        count++;
                    }
                }
            },

            notif_handUpdated: function (notif) {
                this.debug('notif_handUpdated', notif.args);
                this.recreateHandFromData(notif.args.hand, 'deck');
            },

            notif_lineCompleted: function (notif) {
                this.debug('notif_lineCompleted', notif.args);

                // Set temporary z-index on the line so that cards fly above other lines
                dojo.style('table_cards_line_'+notif.args.line_id, 'zIndex', 1);
                
                this.addCardsToLine(notif.args.line_id, notif.args.added_cards, { elt: 'deck' });

                // Reset temporary z-index used when adding cards to the line
                setTimeout( function(line_id) { dojo.style('table_cards_line_'+line_id, 'zIndex', 'auto') }.bind(this, notif.args.line_id), 1500 );

                this.updateDeckCount(notif.args.new_deck_count, notif.args.new_discard_count);
            },

            notif_flockCompleted: function (notif) {
                this.debug('notif_flockCompleted', notif.args);

                if (notif.args.player_id == this.player_id) {
                    // Cards won go from hand to the player collection
                    this.moveToAnotherStock(notif.args.cards_won_ids, this.playerHand, this.playersStock[notif.args.player_id]);
                    // Other cards go to from hand to the discard
                    this.moveToAnotherStock(notif.args.cards_discarded_ids, this.playerHand, this.discard);
                } else {
                    // Cards won go from the player panel to the player collection
                    for (var i in notif.args.cards_won_ids) {
                        var card_id = notif.args.cards_won_ids[i];
                        this.playersStock[notif.args.player_id].addToStockWithId(notif.args.type, card_id, 'hand_cards_p'+notif.args.player_id);
                    }

                    // Other cards go from the player panel to the discard
                    for (var i in notif.args.cards_discarded_ids) {
                        var card_id = notif.args.cards_discarded_ids[i];
                        this.discard.addToStockWithId(notif.args.type, card_id, 'hand_cards_p'+notif.args.player_id);
                    }
                }
                
                this.updateScore(notif.args.player_id, notif.args.type, notif.args.cards_won);

                this.updateHandCountWithDelta(notif.args.player_id, 0 - toint(notif.args.flock_count));

                this.updateDeltaDeckCount(0, notif.args.flock_count - notif.args.cards_won);

                playSound('linkoone_flock_completed');
                this.disableNextMoveSound();
            },

            notif_newHandCount: function (notif) {
                this.debug('notif_newHandCount', notif.args);
                this.updateHandCount(notif.args.player_id, notif.args.new_count);
                this.updateDeckCount(notif.args.new_deck_count, notif.args.new_discard_count);

                // If we have a number of drawn cards, animate temporary objects with card backs for other players to show the action
                if (notif.args.player_id != this.player_id && typeof notif.args.cards_drawn_number != 'undefined') {
                    var delay = 200;
                    for (var i=0 ; i < notif.args.cards_drawn_number ; i++) {
                        this.slideTemporaryObject( '<div class="drawn_card" style="transform: scale('+this.zoomLevel+'"></div>', 'hand_cards_p'+notif.args.player_id, 'deck', 'hand_cards_p'+notif.args.player_id, 1500, delay * i );
                    }
                }
            },
        });
    });
